import { 
    Box, 
    Typography, 
    Card, 
    CardContent, 
    FormControl, 
    InputLabel, 
    Select, 
    MenuItem, 
    Button,
    Divider
} from '@mui/material';
import React, { useState } from 'react';
import { useLanguage, LanguageType } from '../../../../contexts/LanguageContext';

export const SettingsPanel = ({}) => {
    const { language, setLanguage, t } = useLanguage();
    const [selectedLanguage, setSelectedLanguage] = useState<LanguageType>(language);

    const handleLanguageChange = (newLanguage: LanguageType) => {
        setSelectedLanguage(newLanguage);
    };

    const handleSaveLanguage = () => {
        setLanguage(selectedLanguage);
    };

    return (
        <Box
            style={{ maxWidth: 'lg', width: '100%', padding: '2%', height: '90vh', overflow: 'auto' }}
        >
            <Typography variant="h4" gutterBottom>
                {t('admin.settings.title')}
            </Typography>
            
            {/* Language Settings */}
            <Card style={{ marginBottom: '20px' }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        {t('admin.settings.language')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" style={{ marginBottom: '16px' }}>
                        {t('admin.settings.languageDescription')}
                    </Typography>
                    
                    <Box style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                        <Typography variant="body1">
                            {t('admin.settings.currentLanguage')}: 
                        </Typography>
                        <Typography variant="body1" style={{ fontWeight: 'bold' }}>
                            {language === 'en' ? t('admin.settings.english') : t('admin.settings.chinese')}
                        </Typography>
                    </Box>
                    
                    <Box style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <FormControl style={{ minWidth: '200px' }}>
                            <InputLabel>{t('admin.settings.changeLanguage')}</InputLabel>
                            <Select
                                value={selectedLanguage}
                                label={t('admin.settings.changeLanguage')}
                                onChange={(e) => handleLanguageChange(e.target.value as LanguageType)}
                            >
                                <MenuItem value="en">{t('admin.settings.english')}</MenuItem>
                                <MenuItem value="zh">{t('admin.settings.chinese')}</MenuItem>
                            </Select>
                        </FormControl>
                        
                        {selectedLanguage !== language && (
                            <Button 
                                variant="contained" 
                                color="primary"
                                onClick={handleSaveLanguage}
                            >
                                {t('common.save')}
                            </Button>
                        )}
                    </Box>
                </CardContent>
            </Card>
            
            <Divider style={{ margin: '20px 0' }} />
            
            {/* System Information */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        {t('admin.settings.systemInfo')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        • {t('admin.systemInfo.pylipsIntegration')}<br/>
                        • {t('admin.systemInfo.ttsServices')}<br/>
                        • {t('admin.systemInfo.expressionControl')}<br/>
                        • {t('admin.systemInfo.whisperRecognition')}
                    </Typography>
                </CardContent>
            </Card>
        </Box>
    );
};
