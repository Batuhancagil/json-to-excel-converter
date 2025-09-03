const { Pool } = require('pg');

// Veritabanı bağlantı havuzu
let pool;

// In-memory fallback storage for preview mode
let memorySelectionHistory = [];
let memoryTemplates = [
    {
        id: 1,
        name: 'Müşteri Verileri',
        description: 'Temel müşteri bilgileri için template',
        fields: ['id', 'name', 'email', 'phone'],
        usage_count: 0,
        created_at: new Date(),
        updated_at: new Date()
    },
    {
        id: 2,
        name: 'Ürün Listesi',
        description: 'Ürün katalog bilgileri için template',
        fields: ['id', 'name', 'price', 'category', 'stock'],
        usage_count: 0,
        created_at: new Date(),
        updated_at: new Date()
    }
];

// Environment variables'dan veritabanı bilgilerini al
function initializeDatabase() {
    // Preview environment'da fallback mode
    if (process.env.NODE_ENV === 'preview' && !process.env.DATABASE_URL) {
        console.log('🧪 Preview mode: PostgreSQL olmadan çalışıyor (fallback mode)');
        return;
    }
    
    if (process.env.DATABASE_URL) {
        // Railway'de DATABASE_URL kullan
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
    } else {
        // Local development için
        pool = new Pool({
            host: process.env.PGHOST || 'localhost',
            user: process.env.PGUSER || 'postgres',
            password: process.env.PGPASSWORD || 'password',
            database: process.env.PGDATABASE || 'json_converter',
            port: process.env.PGPORT || 5432
        });
    }

    // Bağlantıyı test et ve tabloları oluştur
    pool.query('SELECT NOW()', (err, res) => {
        if (err) {
            console.error('❌ Veritabanı bağlantı hatası:', err.message);
            if (process.env.NODE_ENV === 'preview') {
                console.log('🧪 Preview mode: Fallback mode\'a geçiliyor');
            }
        } else {
            console.log('✅ PostgreSQL veritabanına bağlandı:', res.rows[0].now);
            // Tabloları otomatik oluştur
            createTables();
        }
    });
}

// Tabloları otomatik oluştur
async function createTables() {
    try {
        // Seçim geçmişi tablosu
        await pool.query(`
            CREATE TABLE IF NOT EXISTS selection_history (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                fields TEXT[] NOT NULL,
                field_count INTEGER NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ selection_history tablosu oluşturuldu');

        // Template'ler tablosu
        await pool.query(`
            CREATE TABLE IF NOT EXISTS templates (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                description TEXT,
                fields TEXT[] NOT NULL,
                usage_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ templates tablosu oluşturuldu');

        // Index'ler
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_selection_history_timestamp 
            ON selection_history(timestamp)
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_templates_name 
            ON templates(name)
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_templates_usage 
            ON templates(usage_count)
        `);
        console.log('✅ Index\'ler oluşturuldu');

        // Örnek template'ler ekle
        await pool.query(`
            INSERT INTO templates (name, description, fields) VALUES 
            ('Müşteri Verileri', 'Temel müşteri bilgileri için template', ARRAY['id', 'name', 'email', 'phone']),
            ('Ürün Listesi', 'Ürün katalog bilgileri için template', ARRAY['id', 'name', 'price', 'category', 'stock'])
            ON CONFLICT (name) DO NOTHING
        `);
        console.log('✅ Örnek template\'ler eklendi');

    } catch (error) {
        console.error('❌ Tablo oluşturma hatası:', error.message);
    }
}

// Seçim geçmişi işlemleri
async function saveSelectionHistory(name, fields) {
    // Preview mode fallback
    if (process.env.NODE_ENV === 'preview' && !pool) {
        console.log('🧪 Preview mode: Seçim geçmişi memory\'de saklanıyor');
        const newSelection = {
            id: Date.now(),
            name,
            fields,
            field_count: fields.length,
            timestamp: new Date()
        };
        
        // Son 10 seçimi tut
        memorySelectionHistory.unshift(newSelection);
        memorySelectionHistory = memorySelectionHistory.slice(0, 10);
        
        return newSelection;
    }
    
    try {
        const query = `
            INSERT INTO selection_history (name, fields, field_count) 
            VALUES ($1, $2, $3) 
            RETURNING *
        `;
        const result = await pool.query(query, [name, fields, fields.length]);
        
        // Son 10 seçimi tut (eski olanları sil)
        await pool.query(`
            DELETE FROM selection_history 
            WHERE id NOT IN (
                SELECT id FROM selection_history 
                ORDER BY timestamp DESC 
                LIMIT 10
            )
        `);
        
        return result.rows[0];
    } catch (error) {
        console.error('Seçim geçmişi kaydetme hatası:', error);
        throw error;
    }
}

async function getSelectionHistory() {
    // Preview mode fallback
    if (process.env.NODE_ENV === 'preview' && !pool) {
        console.log('🧪 Preview mode: Memory\'den seçim geçmişi getiriliyor');
        return memorySelectionHistory;
    }
    
    try {
        const query = 'SELECT * FROM selection_history ORDER BY timestamp DESC LIMIT 10';
        const result = await pool.query(query);
        return result.rows;
    } catch (error) {
        console.error('Seçim geçmişi getirme hatası:', error);
        throw error;
    }
}

async function getSelectionById(id) {
    // Preview mode fallback
    if (process.env.NODE_ENV === 'preview' && !pool) {
        console.log('🧪 Preview mode: Memory\'den seçim getiriliyor');
        return memorySelectionHistory.find(selection => selection.id === id);
    }
    
    try {
        const query = 'SELECT * FROM selection_history WHERE id = $1';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    } catch (error) {
        console.error('Seçim getirme hatası:', error);
        throw error;
    }
}

// Template işlemleri
async function saveTemplate(name, description, fields) {
    // Preview mode fallback
    if (process.env.NODE_ENV === 'preview' && !pool) {
        console.log('🧪 Preview mode: Template memory\'de saklanıyor');
        const newTemplate = {
            id: Date.now(),
            name,
            description,
            fields,
            usage_count: 0,
            created_at: new Date(),
            updated_at: new Date()
        };
        
        // Aynı isimde template var mı kontrol et
        const existingIndex = memoryTemplates.findIndex(t => t.name === name);
        if (existingIndex !== -1) {
            throw new Error('Bu isimde bir template zaten mevcut');
        }
        
        memoryTemplates.push(newTemplate);
        return newTemplate;
    }
    
    try {
        const query = `
            INSERT INTO templates (name, description, fields) 
            VALUES ($1, $2, $3) 
            RETURNING *
        `;
        const result = await pool.query(query, [name, description, fields]);
        return result.rows[0];
    } catch (error) {
        if (error.code === '23505') { // Unique constraint violation
            throw new Error('Bu isimde bir template zaten mevcut');
        }
        console.error('Template kaydetme hatası:', error);
        throw error;
    }
}

async function getTemplates() {
    // Preview mode fallback
    if (process.env.NODE_ENV === 'preview' && !pool) {
        console.log('🧪 Preview mode: Memory\'den template\'ler getiriliyor');
        return memoryTemplates.sort((a, b) => b.usage_count - a.usage_count);
    }
    
    try {
        const query = 'SELECT * FROM templates ORDER BY usage_count DESC, created_at DESC';
        const result = await pool.query(query);
        return result.rows;
    } catch (error) {
        console.error('Template getirme hatası:', error);
        throw error;
    }
}

async function getTemplateById(id) {
    // Preview mode fallback
    if (process.env.NODE_ENV === 'preview' && !pool) {
        console.log('🧪 Preview mode: Memory\'den template getiriliyor');
        return memoryTemplates.find(template => template.id === id);
    }
    
    try {
        const query = 'SELECT * FROM templates WHERE id = $1';
        const result = await pool.query(query, [id]);
        return result.rows[0];
    } catch (error) {
        console.error('Template getirme hatası:', error);
        throw error;
    }
}

async function updateTemplateUsage(id) {
    // Preview mode fallback
    if (process.env.NODE_ENV === 'preview' && !pool) {
        console.log('🧪 Preview mode: Template kullanım memory\'de güncelleniyor');
        const template = memoryTemplates.find(t => t.id === id);
        if (template) {
            template.usage_count++;
            template.updated_at = new Date();
        }
        return;
    }
    
    try {
        const query = 'UPDATE templates SET usage_count = usage_count + 1 WHERE id = $1';
        await pool.query(query, [id]);
    } catch (error) {
        console.error('Template kullanım güncelleme hatası:', error);
    }
}

async function deleteTemplate(id) {
    // Preview mode fallback
    if (process.env.NODE_ENV === 'preview' && !pool) {
        console.log('🧪 Preview mode: Template memory\'den siliniyor');
        const index = memoryTemplates.findIndex(t => t.id === id);
        if (index !== -1) {
            memoryTemplates.splice(index, 1);
            return { success: true };
        }
        throw new Error('Template bulunamadı');
    }
    
    try {
        const query = 'DELETE FROM templates WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [id]);
        
        if (result.rows.length === 0) {
            throw new Error('Template bulunamadı');
        }
        
        return result.rows[0];
    } catch (error) {
        console.error('Template silme hatası:', error);
        throw error;
    }
}

// Veritabanı bağlantısını kapat
function closeDatabase() {
    if (pool) {
        pool.end();
        console.log('✅ Veritabanı bağlantısı kapatıldı');
    }
}

module.exports = {
    initializeDatabase,
    createTables,
    saveSelectionHistory,
    getSelectionHistory,
    getSelectionById,
    saveTemplate,
    getTemplates,
    getTemplateById,
    updateTemplateUsage,
    deleteTemplate,
    closeDatabase
};
