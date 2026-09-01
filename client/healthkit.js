// HealthKit Integration for Pumba Tracker
// This module handles iOS Health app data synchronization

class HealthKitIntegration {
    constructor() {
        this.isAvailable = false;
        this.checkAvailability();
    }

    async checkAvailability() {
        // Check if we're in Telegram WebApp on iOS
        const tg = window.Telegram?.WebApp;
        if (!tg) return;

        // HealthKit is only available in native iOS apps
        // For WebApp, we need to use a bridge or manual input
        this.isAvailable = false;
        console.log('HealthKit: Native integration not available in WebApp');
    }

    // Request HealthKit permissions (for future native app)
    async requestPermissions() {
        const types = [
            'stepCount',
            'activeEnergyBurned',
            'basalEnergyBurned',
            'heartRate',
            'sleepAnalysis',
            'workout'
        ];
        
        // This would be implemented in a native iOS wrapper
        console.log('HealthKit permissions requested for:', types);
        return false;
    }

    // Manual entry for WebApp (fallback)
    async syncHealthData(manualData = null) {
        if (manualData) {
            return this.submitHealthData(manualData);
        }

        // Try to get data from any available source
        // For now, prompt user to enter or use shortcuts
        return this.promptManualEntry();
    }

    async submitHealthData(data) {
        const API_URL = window.location.origin.includes('localhost') 
            ? 'http://localhost:3000/api' 
            : `${window.location.origin}/api`;

        try {
            const response = await fetch(`${API_URL}/health`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return response.ok;
        } catch (err) {
            console.error('Health data sync error:', err);
            return false;
        }
    }

    promptManualEntry() {
        // Show modal for manual health data entry
        const modal = document.createElement('div');
        modal.className = 'health-modal';
        modal.innerHTML = `
            <div class="health-modal-content">
                <h3>📱 Данные о здоровье</h3>
                <p>iOS HealthKit доступен только в нативном приложении.</p>
                <p>Для WebApp используйте:</p>
                <ul>
                    <li>Apple Shortcuts для автоматической отправки</li>
                    <li>Ручной ввод ниже</li>
                </ul>
                <div class="health-form">
                    <input type="number" id="health-steps" placeholder="Шаги">
                    <input type="number" id="health-calories" placeholder="Калории">
                    <input type="number" id="health-active-min" placeholder="Активных минут">
                    <button onclick="this.closest('.health-modal').remove()">Отмена</button>
                    <button onclick="submitManualHealth()">Сохранить</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Apple Shortcuts integration guide
    getShortcutsGuide() {
        return {
            title: 'Apple Shortcuts для Pumba',
            steps: [
                '1. Откройте приложение "Быстрые команды"',
                '2. Создайте новую автоматизацию',
                '3. Триггер: "Время дня" (например, 22:00)',
                '4. Действия:',
                '   - Получить данные Health (шаги, калории)',
                '   - Отправить POST запрос на API',
                '5. API endpoint: POST /api/health',
                '6. Headers: Content-Type: application/json',
                '7. Body: { user_id, date, steps, calories_burned }'
            ],
            shortcutURL: 'https://www.icloud.com/shortcuts/...' // Would be generated
        };
    }
}

// Global instance
window.healthKit = new HealthKitIntegration();

// Manual submit function
window.submitManualHealth = async function() {
    const steps = document.getElementById('health-steps')?.value;
    const calories = document.getElementById('health-calories')?.value;
    const activeMin = document.getElementById('health-active-min')?.value;
    
    const userId = window.currentUser?.id;
    if (!userId) return;

    const data = {
        user_id: userId,
        date: new Date().toISOString().split('T')[0],
        steps: steps ? parseInt(steps) : null,
        calories_burned: calories ? parseInt(calories) : null,
        active_minutes: activeMin ? parseInt(activeMin) : null,
        source: 'manual'
    };

    const success = await window.healthKit.submitHealthData(data);
    if (success) {
        document.querySelector('.health-modal')?.remove();
        window.Telegram?.WebApp?.showPopup({ title: 'Готово', message: 'Данные сохранены' });
    }
};
