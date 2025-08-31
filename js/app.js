// Configuration
const config = {
    apiKey: '2b59073ec277d4fc62ad67dcdd9ad65b',
    baseUrl: 'https://api.openweathermap.org/data/2.5/',
    iconBaseUrl: 'https://openweathermap.org/img/wn/',
    units: 'metric' // Default to Celsius
};

// DOM Elements
const elements = {
    locationInput: document.getElementById('location-input'),
    searchBtn: document.getElementById('search-btn'),
    currentLocationBtn: document.getElementById('current-location-btn'),
    currentCity: document.getElementById('current-city'),
    currentDate: document.getElementById('current-date'),
    currentDescription: document.getElementById('current-description'),
    currentIcon: document.getElementById('current-icon'),
    currentTemp: document.getElementById('current-temp'),
    windSpeed: document.getElementById('wind-speed'),
    humidity: document.getElementById('humidity'),
    pressure: document.getElementById('pressure'),
    hourlyContainer: document.getElementById('hourly-container'),
    dailyContainer: document.getElementById('daily-container'),
    uvIndex: document.getElementById('uv-index'),
    uvRisk: document.getElementById('uv-risk'),
    visibility: document.getElementById('visibility'),
    visibilityDesc: document.getElementById('visibility-desc'),
    sunrise: document.getElementById('sunrise'),
    sunset: document.getElementById('sunset'),
    lastUpdated: document.getElementById('last-updated'),
    loadingOverlay: document.getElementById('loading-overlay'),
    unitF: document.getElementById('unit-f'),
    unitC: document.getElementById('unit-c'),
    progressBar: document.querySelector('.uv-progress .progress-bar')
};

// App State
let appState = {
    currentData: null,
    forecastData: null,
    units: config.units,
    lastLocation: 'Peshawar'
};

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    fetchWeatherByLocation(appState.lastLocation);
});

function setupEventListeners() {
    elements.searchBtn.addEventListener('click', searchLocation);
    elements.currentLocationBtn.addEventListener('click', getCurrentLocationWeather);
    elements.locationInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchLocation();
    });
    elements.unitF.addEventListener('click', () => switchUnits('imperial'));
    elements.unitC.addEventListener('click', () => switchUnits('metric'));
}

async function fetchWeatherByLocation(location) {
    showLoading(true);
    try {
        // Fetch current weather
        const currentResponse = await fetch(
            `${config.baseUrl}weather?q=${encodeURIComponent(location)}&units=${appState.units}&appid=${config.apiKey}`
        );
        
        if (!currentResponse.ok) {
            throw new Error(await currentResponse.text());
        }
        
        const currentData = await currentResponse.json();
        appState.currentData = currentData;
        appState.lastLocation = `${currentData.name},${currentData.sys.country}`;
        
        // Fetch 5-day forecast
        const forecastResponse = await fetch(
            `${config.baseUrl}forecast?q=${encodeURIComponent(location)}&units=${appState.units}&appid=${config.apiKey}`
        );
        
        if (!forecastResponse.ok) {
            throw new Error(await forecastResponse.text());
        }
        
        const forecastData = await forecastResponse.json();
        appState.forecastData = forecastData;
        
        // Update UI
        updateCurrentWeather();
        updateForecast();
        updateLastUpdated();
        
    } catch (error) {
        console.error('Error fetching weather data:', error);
        showError('Failed to fetch weather data. Please check the location and try again.');
    } finally {
        showLoading(false);
    }
}

function updateCurrentWeather() {
    const data = appState.currentData;
    const weather = data.weather[0];
    
    // Location and date
    elements.currentCity.textContent = `${data.name}, ${data.sys.country}`;
    elements.currentDate.textContent = formatDate(new Date());
    elements.currentDescription.textContent = weather.description;
    
    // Temperature and icon
    elements.currentTemp.textContent = Math.round(data.main.temp);
    elements.currentIcon.src = `${config.iconBaseUrl}${weather.icon}@2x.png`;
    elements.currentIcon.alt = weather.description;
    
    // Weather details
    elements.windSpeed.textContent = Math.round(data.wind.speed);
    elements.humidity.textContent = data.main.humidity;
    elements.pressure.textContent = data.main.pressure;
    
    // Set dynamic background based on weather
    setWeatherTheme(weather.main);
}

function updateForecast() {
    const forecast = appState.forecastData;
    updateHourlyForecast(forecast.list);
    updateDailyForecast(forecast.list);
    updateAdditionalData();
}

function updateHourlyForecast(hourlyData) {
    elements.hourlyContainer.innerHTML = '';
    
    // Get next 8 hours (3-hour intervals)
    const now = new Date();
    const currentHour = now.getHours();
    
    for (let i = 0; i < 8; i++) {
        const hourData = hourlyData[i];
        const hourTime = new Date(hourData.dt * 1000);
        
        const hourItem = document.createElement('div');
        hourItem.className = 'hourly-item animate__animated animate__fadeIn';
        hourItem.style.animationDelay = `${i * 0.1}s`;
        hourItem.innerHTML = `
            <div class="hour">${formatHour(hourTime.getHours())}</div>
            <img src="${config.iconBaseUrl}${hourData.weather[0].icon}.png" 
                 alt="${hourData.weather[0].description}"
                 class="animate__animated animate__pulse">
            <div class="temp">${Math.round(hourData.main.temp)}°</div>
        `;
        elements.hourlyContainer.appendChild(hourItem);
    }
}

function updateDailyForecast(forecastList) {
    elements.dailyContainer.innerHTML = '';
    
    // Group by day
    const dailyForecasts = {};
    forecastList.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dayKey = date.toLocaleDateString();
        
        if (!dailyForecasts[dayKey]) {
            dailyForecasts[dayKey] = {
                date,
                temps: [],
                weather: item.weather[0],
                list: []
            };
        }
        
        dailyForecasts[dayKey].temps.push(item.main.temp);
        dailyForecasts[dayKey].list.push(item);
    });
    
    // Get next 5 days (skip today)
    const days = Object.values(dailyForecasts).slice(1, 6);
    
    days.forEach((day, index) => {
        const maxTemp = Math.round(Math.max(...day.temps));
        const minTemp = Math.round(Math.min(...day.temps));
        
        const dayItem = document.createElement('div');
        dayItem.className = 'daily-item animate__animated animate__fadeIn';
        dayItem.style.animationDelay = `${index * 0.1}s`;
        dayItem.innerHTML = `
            <div class="day">${formatDay(day.date)}</div>
            <img src="${config.iconBaseUrl}${day.weather.icon}.png" 
                 alt="${day.weather.description}"
                 class="animate__animated animate__pulse">
            <div class="temps">
                <span class="max-temp">${maxTemp}°</span>
                <span class="min-temp">${minTemp}°</span>
            </div>
        `;
        elements.dailyContainer.appendChild(dayItem);
    });
}

function updateAdditionalData() {
    const current = appState.currentData;
    
    // UV Index (simulated since not in free API)
    const uvIndex = Math.random() * 10 + 1; // Random between 1-11 for demo
    elements.uvIndex.textContent = uvIndex.toFixed(1);
    setUvIndex(uvIndex);
    
    // Visibility
    const visibilityKm = (current.visibility / 1000).toFixed(1);
    elements.visibility.textContent = visibilityKm;
    setVisibilityDescription(visibilityKm);
    
    // Sunrise/Sunset
    const sunriseTime = new Date(current.sys.sunrise * 1000);
    const sunsetTime = new Date(current.sys.sunset * 1000);
    elements.sunrise.textContent = formatTime(sunriseTime);
    elements.sunset.textContent = formatTime(sunsetTime);
}

function setUvIndex(uvi) {
    let riskLevel = '';
    let riskColor = '';
    let percentage = (uvi / 11) * 100;
    
    if (uvi < 3) {
        riskLevel = 'Low';
        riskColor = '#4cc9f0';
    } else if (uvi < 6) {
        riskLevel = 'Moderate';
        riskColor = '#4361ee';
    } else if (uvi < 8) {
        riskLevel = 'High';
        riskColor = '#7209b7';
    } else if (uvi < 11) {
        riskLevel = 'Very High';
        riskColor = '#f72585';
    } else {
        riskLevel = 'Extreme';
        riskColor = '#d90429';
    }
    
    elements.uvRisk.textContent = riskLevel;
    elements.uvRisk.style.backgroundColor = riskColor;
    elements.progressBar.style.width = `${percentage}%`;
    elements.progressBar.style.background = riskColor;
}

function setVisibilityDescription(visibility) {
    let desc = '';
    if (visibility > 10) desc = 'Perfect visibility';
    else if (visibility > 5) desc = 'Good visibility';
    else if (visibility > 2) desc = 'Moderate visibility';
    else desc = 'Poor visibility';
    
    elements.visibilityDesc.textContent = desc;
}

function setWeatherTheme(weatherCondition) {
    const app = document.querySelector('.weather-app');
    const bgAnimation = document.querySelector('.bg-animation');
    
    // Remove previous weather classes
    app.className = 'weather-app';
    bgAnimation.className = 'bg-animation';
    
    // Add class based on weather condition
    switch(weatherCondition.toLowerCase()) {
        case 'clear':
            app.classList.add('clear-sky');
            bgAnimation.classList.add('clear-animation');
            break;
        case 'clouds':
            app.classList.add('cloudy');
            bgAnimation.classList.add('cloudy-animation');
            break;
        case 'rain':
            app.classList.add('rainy');
            bgAnimation.classList.add('rainy-animation');
            break;
        case 'snow':
            app.classList.add('snowy');
            bgAnimation.classList.add('snowy-animation');
            break;
        case 'thunderstorm':
            app.classList.add('stormy');
            bgAnimation.classList.add('stormy-animation');
            break;
        default:
            app.classList.add('default-weather');
    }
}

function searchLocation() {
    const location = elements.locationInput.value.trim();
    if (location) {
        fetchWeatherByLocation(location);
    } else {
        showError('Please enter a location');
    }
}

function getCurrentLocationWeather() {
    if (navigator.geolocation) {
        showLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    const response = await fetch(
                        `${config.baseUrl}weather?lat=${latitude}&lon=${longitude}&units=${appState.units}&appid=${config.apiKey}`
                    );
                    
                    if (!response.ok) {
                        throw new Error(await response.text());
                    }
                    
                    const data = await response.json();
                    elements.locationInput.value = `${data.name}, ${data.sys.country}`;
                    fetchWeatherByLocation(`${data.name},${data.sys.country}`);
                } catch (error) {
                    console.error('Error fetching location weather:', error);
                    showError('Failed to get weather for your location');
                } finally {
                    showLoading(false);
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                showError('Location access denied. Please enable location services.');
                showLoading(false);
            }
        );
    } else {
        showError('Geolocation is not supported by your browser');
    }
}

function switchUnits(unitSystem) {
    appState.units = unitSystem;
    
    if (unitSystem === 'imperial') {
        elements.unitF.classList.add('active');
        elements.unitC.classList.remove('active');
    } else {
        elements.unitF.classList.remove('active');
        elements.unitC.classList.add('active');
    }
    
    if (appState.lastLocation) {
        fetchWeatherByLocation(appState.lastLocation.split(',')[0].trim());
    }
}

function updateLastUpdated() {
    const now = new Date();
    elements.lastUpdated.textContent = `Updated: ${formatTime(now)}`;
}

function showLoading(show) {
    if (show) {
        elements.loadingOverlay.classList.add('active');
    } else {
        elements.loadingOverlay.classList.remove('active');
    }
}

function showError(message) {
    const errorEl = document.createElement('div');
    errorEl.className = 'error-message animate__animated animate__fadeIn';
    errorEl.innerHTML = `
        <div class="error-content">
            <i class="fas fa-exclamation-circle"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(errorEl);
    
    setTimeout(() => {
        errorEl.classList.add('animate__fadeOut');
        setTimeout(() => errorEl.remove(), 300);
    }, 3000);
}

// Formatting functions
function formatDate(date) {
    return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function formatTime(date) {
    return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit' 
    });
}

function formatHour(hour) {
    return new Date(0, 0, 0, hour).toLocaleTimeString('en-US', { 
        hour: 'numeric' 
    });
}

function formatDay(date) {
    return date.toLocaleDateString('en-US', { 
        weekday: 'short' 
    });
}