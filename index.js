const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

// Multer configuration for file uploads (Serverless compatible)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Store uploaded JSON data temporarily
let uploadedData = null;
let availableFields = [];

// Selection history system
let selectionHistory = [];
const MAX_HISTORY_SIZE = 10;

// Template system (Serverless compatible)
let templates = [];

// Initialize with sample templates for demo
function initializeTemplates() {
    if (templates.length === 0) {
        templates = [
            {
                id: Date.now(),
                name: "Örnek Müşteri Verileri",
                description: "Temel müşteri bilgileri için template",
                fields: ["id", "name", "email", "age"],
                createdAt: new Date().toISOString(),
                usageCount: 0
            },
            {
                id: Date.now() + 1,
                name: "Ürün Listesi",
                description: "Ürün katalog verileri için template",
                fields: ["productId", "productName", "price", "category"],
                createdAt: new Date().toISOString(),
                usageCount: 0
            }
        ];
        console.log('Örnek template\'ler yüklendi');
    }
}

// Save templates to memory (serverless compatible)
function saveTemplates() {
    // In serverless environment, we keep templates in memory
    // They will be reset on each cold start, but that's acceptable for demo
    console.log('Templates memory\'de saklandı');
}

// Initialize database and templates on startup
db.initializeDatabase();

// Initialize templates on startup
initializeTemplates();

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Upload JSON file or accept JSON data
app.post('/upload', upload.single('jsonFile'), (req, res) => {
    try {
        let jsonData;
        
        if (req.file) {
            // File upload (Serverless compatible)
            const fileContent = req.file.buffer.toString('utf8');
            jsonData = JSON.parse(fileContent);
            // No need to clean up in serverless environment
        } else if (req.body.jsonData) {
            // Direct JSON input
            jsonData = JSON.parse(req.body.jsonData);
        } else {
            return res.status(400).json({ error: 'JSON verisi bulunamadı' });
        }

        // Validate JSON structure
        if (!Array.isArray(jsonData) && typeof jsonData !== 'object') {
            return res.status(400).json({ error: 'Geçersiz JSON formatı' });
        }

        // Convert to array if it's a single object
        const dataArray = Array.isArray(jsonData) ? jsonData : [jsonData];
        
        if (dataArray.length === 0) {
            return res.status(400).json({ error: 'JSON verisi boş' });
        }

        // Extract available fields from the first object
        availableFields = Object.keys(dataArray[0]);
        uploadedData = dataArray;

        // Veritabanından güncel verileri al
        Promise.all([
            db.getSelectionHistory(),
            db.getTemplates()
        ]).then(([history, dbTemplates]) => {
            selectionHistory = history;
            templates = dbTemplates;
            
            res.json({
                success: true,
                message: 'JSON verisi başarıyla yüklendi',
                fieldCount: availableFields.length,
                recordCount: dataArray.length,
                fields: availableFields,
                selectionHistory: selectionHistory,
                templates: templates
            });
        }).catch(error => {
            console.error('Veritabanı veri getirme hatası:', error);
            res.json({
                success: true,
                message: 'JSON verisi başarıyla yüklendi',
                fieldCount: availableFields.length,
                recordCount: dataArray.length,
                fields: availableFields,
                selectionHistory: selectionHistory,
                templates: templates
            });
        });

    } catch (error) {
        console.error('JSON parsing error:', error);
        res.status(400).json({ error: 'JSON verisi işlenirken hata oluştu: ' + error.message });
    }
});

// Get available fields
app.get('/fields', (req, res) => {
    if (!uploadedData) {
        return res.status(400).json({ error: 'Önce JSON verisi yükleyin' });
    }
    res.json({ fields: availableFields });
});

// Convert to Excel with selected fields
app.post('/convert', (req, res) => {
    try {
        const { selectedFields, customFilename } = req.body;
        
        if (!uploadedData) {
            return res.status(400).json({ error: 'Önce JSON verisi yükleyin' });
        }

        if (!selectedFields || !Array.isArray(selectedFields) || selectedFields.length === 0) {
            return res.status(400).json({ error: 'En az bir alan seçmelisiniz' });
        }

        // Validate selected fields - nested array fields için özel kontrol
        const invalidFields = selectedFields.filter(field => {
            if (field.includes('.')) {
                // Nested array field (e.g., "products.name")
                const [arrayField, nestedField] = field.split('.');
                return !availableFields.includes(arrayField);
            } else {
                // Normal field
                return !availableFields.includes(field);
            }
        });
        
        if (invalidFields.length > 0) {
            return res.status(400).json({ error: `Geçersiz alanlar: ${invalidFields.join(', ')}` });
        }

        // Create workbook and worksheet
        const workbook = XLSX.utils.book_new();
        
        // Filter data to only include selected fields
        const filteredData = [];
        
        uploadedData.forEach(item => {
            // Check if there are nested fields (array or object)
            const nestedFields = selectedFields.filter(field => field.includes('.'));
            const nonNestedFields = selectedFields.filter(field => !field.includes('.'));
            
            if (nestedFields.length > 0) {
                // Find the main array field (e.g., "products")
                const arrayFields = nestedFields.filter(field => {
                    const fieldParts = field.split('.');
                    const mainField = fieldParts[0];
                    return Array.isArray(item[mainField]);
                });
                
                if (arrayFields.length > 0) {
                    // We have array fields, process them
                    const mainArrayField = arrayFields[0].split('.')[0];
                    
                    if (Array.isArray(item[mainArrayField])) {
                        // For each item in the array, create a separate row
                        item[mainArrayField].forEach((arrayItem, index) => {
                            const row = {};
                            
                            // Add non-nested fields only for the first product (index === 0)
                            nonNestedFields.forEach(field => {
                                if (index === 0) {
                                    // First product - show the value
                                    row[field] = item[field];
                                } else {
                                    // Other products - leave empty (undefined)
                                    row[field] = undefined;
                                }
                            });
                            
                            // Add nested fields (both array and object)
                            nestedFields.forEach(selectedField => {
                                const fieldParts = selectedField.split('.');
                                
                                if (fieldParts.length === 2) {
                                    // Simple nested field: products.name or user.name
                                    const [mainField, propertyField] = fieldParts;
                                    
                                    if (mainField === mainArrayField) {
                                        // This is an array field (e.g., products.name)
                                        if (arrayItem[propertyField] !== undefined) {
                                            row[selectedField] = arrayItem[propertyField];
                                        }
                                    } else {
                                        // This is an object field (e.g., user.name)
                                        if (item[mainField] && item[mainField][propertyField] !== undefined) {
                                            row[selectedField] = item[mainField][propertyField];
                                        }
                                    }
                                } else if (fieldParts.length >= 3) {
                                    // Deep nested field: products.product.name
                                    const [mainField, objectField, propertyField] = fieldParts;
                                    
                                    if (mainField === mainArrayField) {
                                        // This is an array field (e.g., products.product.name)
                                        if (arrayItem[objectField] && arrayItem[objectField][propertyField] !== undefined) {
                                            row[selectedField] = arrayItem[objectField][propertyField];
                                        }
                                    } else {
                                        // This is an object field (e.g., user.global_user.name)
                                        if (item[mainField] && item[mainField][objectField] && item[mainField][objectField][propertyField] !== undefined) {
                                            row[selectedField] = item[mainField][objectField][propertyField];
                                        }
                                    }
                                }
                            });
                            
                            filteredData.push(row);
                        });
                    }
                } else {
                    // No array fields, but we have nested object fields
                    // Create single row with all fields
                    const row = {};
                    
                    // Add non-nested fields
                    nonNestedFields.forEach(field => {
                        row[field] = item[field];
                    });
                    
                    // Add nested object fields
                    nestedFields.forEach(selectedField => {
                        const fieldParts = selectedField.split('.');
                        
                        if (fieldParts.length === 2) {
                            // Simple nested field: user.name
                            const [mainField, propertyField] = fieldParts;
                            if (item[mainField] && item[mainField][propertyField] !== undefined) {
                                row[selectedField] = item[mainField][propertyField];
                            }
                        } else if (fieldParts.length >= 3) {
                            // Deep nested field: user.global_user.name
                            const [mainField, objectField, propertyField] = fieldParts;
                            if (item[mainField] && item[mainField][objectField] && item[mainField][objectField][propertyField] !== undefined) {
                                row[selectedField] = item[mainField][objectField][propertyField];
                            }
                        }
                    });
                    
                    filteredData.push(row);
                }
            } else {
                // Only non-nested fields - create single row
                const row = {};
                selectedFields.forEach(field => {
                    if (item[field] !== undefined) {
                        row[field] = item[field];
                    }
                });
                filteredData.push(row);
            }
        });

        // Create worksheet
        const worksheet = XLSX.utils.json_to_sheet(filteredData);
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'JSON Data');

        // Generate filename - use custom name if provided, otherwise use default
        let filename;
        if (customFilename && customFilename.trim()) {
            // Remove any file extension if user included it
            const cleanName = customFilename.trim().replace(/\.(xlsx|xls)$/i, '');
            filename = `${cleanName}.xlsx`;
        } else {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            filename = `converted_data_${timestamp}.xlsx`;
        }
        const filepath = path.join(__dirname, 'downloads', filename);

        // Save selection to database
        const selectionName = customFilename || `Seçim ${new Date().toISOString().slice(0, 19)}`;
        
        db.saveSelectionHistory(selectionName, selectedFields)
            .then(savedSelection => {
                console.log('Seçim geçmişi veritabanına kaydedildi:', savedSelection.id);
            })
            .catch(error => {
                console.error('Seçim geçmişi kaydetme hatası:', error);
            });

        // Create buffer for download (Serverless compatible)
        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        
        // Set headers for file download
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        // Send buffer
        res.send(excelBuffer);

    } catch (error) {
        console.error('Conversion error:', error);
        res.status(500).json({ error: 'Excel dönüştürme hatası: ' + error.message });
    }
});

// Get selection history
app.get('/history', (req, res) => {
    db.getSelectionHistory()
        .then(history => {
            res.json({ 
                success: true, 
                history: history 
            });
        })
        .catch(error => {
            console.error('Seçim geçmişi getirme hatası:', error);
            res.status(500).json({ error: 'Seçim geçmişi getirilemedi' });
        });
});

// Apply previous selection
app.post('/apply-selection', async (req, res) => {
    try {
        const { selectionId } = req.body;
        
        if (!selectionId) {
            return res.status(400).json({ error: 'Seçim ID gerekli' });
        }
        
        const selection = await db.getSelectionById(parseInt(selectionId));
        if (!selection) {
            return res.status(404).json({ error: 'Seçim bulunamadı' });
        }
        
        // Check which fields are available in current data
        const availableFieldsInSelection = selection.fields.filter(field => 
            availableFields.includes(field) || 
            availableFields.some(availableField => field.startsWith(availableField + '.'))
        );
        
        const unavailableFields = selection.fields.filter(field => 
            !availableFieldsInSelection.includes(field)
        );
        
        res.json({
            success: true,
            appliedFields: availableFieldsInSelection,
            unavailableFields: unavailableFields,
            message: `${availableFieldsInSelection.length} alan uygulandı${unavailableFields.length > 0 ? `, ${unavailableFields.length} alan mevcut değil` : ''}`
        });
        
    } catch (error) {
        console.error('Apply selection error:', error);
        res.status(500).json({ error: 'Seçim uygulanırken hata oluştu: ' + error.message });
    }
});

// Smart field matching
app.post('/smart-match', async (req, res) => {
    try {
        if (!uploadedData || availableFields.length === 0) {
            return res.status(400).json({ error: 'Önce JSON verisi yükleyin' });
        }
        
        // Get the most recent selection as reference from database
        const history = await db.getSelectionHistory();
        if (history.length === 0) {
            return res.status(400).json({ error: 'Henüz seçim geçmişi yok' });
        }
        
        const lastSelection = history[0];
        const referenceFields = lastSelection.fields;
        
        // Smart matching algorithm
        const matchedFields = [];
        const suggestions = [];
        
        referenceFields.forEach(refField => {
            // Exact match
            if (availableFields.includes(refField)) {
                matchedFields.push(refField);
                return;
            }
            
            // Partial match (case insensitive)
            const lowerRefField = refField.toLowerCase();
            const exactMatches = availableFields.filter(field => 
                field.toLowerCase() === lowerRefField
            );
            
            if (exactMatches.length > 0) {
                matchedFields.push(...exactMatches);
                return;
            }
            
            // Similar match (contains or similar words)
            const similarMatches = availableFields.filter(field => {
                const lowerField = field.toLowerCase();
                
                // Check if field contains reference field or vice versa
                if (lowerField.includes(lowerRefField) || lowerRefField.includes(lowerField)) {
                    return true;
                }
                
                // Check for similar words (simple word matching)
                const refWords = lowerRefField.split(/[._-]/);
                const fieldWords = lowerField.split(/[._-]/);
                
                const commonWords = refWords.filter(word => 
                    fieldWords.some(fieldWord => 
                        fieldWord.includes(word) || word.includes(fieldWord)
                    )
                );
                
                return commonWords.length > 0;
            });
            
            if (similarMatches.length > 0) {
                suggestions.push({
                    reference: refField,
                    suggestions: similarMatches
                });
            }
        });
        
        res.json({
            success: true,
            matchedFields: matchedFields,
            suggestions: suggestions,
            message: `${matchedFields.length} alan eşleşti, ${suggestions.length} öneri var`
        });
        
    } catch (error) {
        console.error('Smart match error:', error);
        res.status(500).json({ error: 'Akıllı eşleştirme hatası: ' + error.message });
    }
});

// Template management endpoints
app.get('/templates', (req, res) => {
    db.getTemplates()
        .then(dbTemplates => {
            res.json({ 
                success: true, 
                templates: dbTemplates 
            });
        })
        .catch(error => {
            console.error('Template getirme hatası:', error);
            res.status(500).json({ error: 'Template\'ler getirilemedi' });
        });
});

app.post('/save-template', (req, res) => {
    try {
        const { name, fields, description } = req.body;
        
        if (!name || !fields || !Array.isArray(fields)) {
            return res.status(400).json({ error: 'Template adı ve alanları gerekli' });
        }
        
        // Save template to database
        db.saveTemplate(name.trim(), description ? description.trim() : '', fields)
            .then(savedTemplate => {
                res.json({
                    success: true,
                    message: 'Template başarıyla kaydedildi',
                    template: savedTemplate
                });
            })
            .catch(error => {
                res.status(400).json({ error: error.message });
            });
        
    } catch (error) {
        console.error('Save template error:', error);
        res.status(500).json({ error: 'Template kaydedilirken hata oluştu: ' + error.message });
    }
});

app.post('/apply-template', async (req, res) => {
    try {
        const { templateId } = req.body;
        
        if (!templateId) {
            return res.status(400).json({ error: 'Template ID gerekli' });
        }
        
        const template = await db.getTemplateById(parseInt(templateId));
        if (!template) {
            return res.status(404).json({ error: 'Template bulunamadı' });
        }
        
        // Check which fields are available in current data
        const availableFieldsInTemplate = template.fields.filter(field => 
            availableFields.includes(field) || 
            availableFields.some(availableField => field.startsWith(availableField + '.'))
        );
        
        const unavailableFields = template.fields.filter(field => 
            !availableFieldsInTemplate.includes(field)
        );
        
        // Update usage count in database
        await db.updateTemplateUsage(parseInt(templateId));
        
        res.json({
            success: true,
            appliedFields: availableFieldsInTemplate,
            unavailableFields: unavailableFields,
            templateName: template.name,
            message: `"${template.name}" template'i uygulandı: ${availableFieldsInTemplate.length} alan uygulandı${unavailableFields.length > 0 ? `, ${unavailableFields.length} alan mevcut değil` : ''}`
        });
        
    } catch (error) {
        console.error('Apply template error:', error);
        res.status(500).json({ error: 'Template uygulanırken hata oluştu: ' + error.message });
    }
});

app.delete('/delete-template/:id', async (req, res) => {
    try {
        const templateId = parseInt(req.params.id);
        
        const deletedTemplate = await db.deleteTemplate(templateId);
        if (!deletedTemplate) {
            return res.status(404).json({ error: 'Template bulunamadı' });
        }
        
        res.json({
            success: true,
            message: `"${deletedTemplate.name}" template'i silindi`,
            deletedTemplate: deletedTemplate
        });
        
    } catch (error) {
        console.error('Delete template error:', error);
        res.status(500).json({ error: 'Template silinirken hata oluştu: ' + error.message });
    }
});

// Clear uploaded data
app.post('/clear', (req, res) => {
    uploadedData = null;
    availableFields = [];
    res.json({ success: true, message: 'Veriler temizlendi' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server ${PORT} portunda çalışıyor`);
    console.log(`Tarayıcınızda http://localhost:${PORT} adresini açın`);
    
    // Environment bilgisi
    if (process.env.NODE_ENV === 'preview') {
        console.log('🧪 Preview Environment: Fallback mode aktif');
    } else if (process.env.NODE_ENV === 'production') {
        console.log('🏭 Production Environment: PostgreSQL aktif');
    } else {
        console.log('🖥️ Local Environment: PostgreSQL aktif');
    }
});
