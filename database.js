const { Pool } = require('pg');

// Veritabanı bağlantı havuzu
let pool;

// Environment variables'dan veritabanı bilgilerini al
function initializeDatabase() {
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

    // Bağlantıyı test et
    pool.query('SELECT NOW()', (err, res) => {
        if (err) {
            console.error('❌ Veritabanı bağlantı hatası:', err.message);
        } else {
            console.log('✅ PostgreSQL veritabanına bağlandı:', res.rows[0].now);
        }
    });
}

// Seçim geçmişi işlemleri
async function saveSelectionHistory(name, fields) {
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
    try {
        const query = 'UPDATE templates SET usage_count = usage_count + 1 WHERE id = $1';
        await pool.query(query, [id]);
    } catch (error) {
        console.error('Template kullanım güncelleme hatası:', error);
    }
}

async function deleteTemplate(id) {
    try {
        const query = 'DELETE FROM templates WHERE id = $1 RETURNING *';
        const result = await pool.query(query, [id]);
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
    }
}

module.exports = {
    initializeDatabase,
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
