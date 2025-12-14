// Replace with your OpenWeatherMap API key
const API_KEY = '806d928035facc1c76103746504fa1a3';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// DOM Elements
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const loadingModal = document.getElementById('loadingModal');

// Weather display elements
const cityName = document.getElementById('cityName');
const temperature = document.getElementById('temperature');
const feelsLike = document.getElementById('feelsLike');
const weatherCondition = document.getElementById('weatherCondition');
const weatherIcon = document.getElementById('weatherIcon');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('windSpeed');
const pressure = document.getElementById('pressure');
const visibility = document.getElementById('visibility');
const forecastContainer = document.getElementById('forecastContainer');
const recentSearches = document.getElementById('recentSearches');

// Recent searches array
let recentCities = JSON.parse(localStorage.getItem('recentCities')) || [];

// Initialize
updateRecentSearches();

// Event Listeners
searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) {
        fetchWeatherData(city);
    } else {
        alert('Please enter a city name');
    }
});

locationBtn.addEventListener('click', getUserLocation);

cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchBtn.click();
    }
});

// Fetch weather data
async function fetchWeatherData(city) {
    showLoading();
    
    try {
        // Fetch current weather
        const currentResponse = await fetch(
            `${BASE_URL}/weather?q=${city}&appid=${API_KEY}&units=metric`
        );
        
        if (!currentResponse.ok) {
            throw new Error('City not found');
        }
        
        const currentData = await currentResponse.json();
        
        // Fetch 5-day forecast
        const forecastResponse = await fetch(
            `${BASE_URL}/forecast?q=${city}&appid=${API_KEY}&units=metric`
        );
        
        const forecastData = await forecastResponse.json();
        
        updateCurrentWeather(currentData);
        updateForecast(forecastData);
        addToRecentSearches(city);
        
    } catch (error) {
        alert('Error: ' + error.message + '. Please check the city name and try again.');
    } finally {
        hideLoading();
        cityInput.value = '';
    }
}

// Get user's location
function getUserLocation() {
    if (navigator.geolocation) {
        showLoading();
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                
                try {
                    // Get city name from coordinates
                    const reverseGeocode = await fetch(
                        `${BASE_URL}/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`
                    );
                    
                    const data = await reverseGeocode.json();
                    
                    // Fetch weather for the detected location
                    const city = data.name;
                    cityInput.value = city;
                    await fetchWeatherData(city);
                    
                } catch (error) {
                    alert('Error getting location data');
                } finally {
                    hideLoading();
                }
            },
            (error) => {
                alert('Please allow location access to use this feature');
                hideLoading();
            }
        );
    } else {
        alert('Geolocation is not supported by your browser');
    }
}

// Update current weather display
function updateCurrentWeather(data) {
    cityName.textContent = `${data.name}, ${data.sys.country}`;
    temperature.textContent = `${Math.round(data.main.temp)}°C`;
    feelsLike.textContent = `${Math.round(data.main.feels_like)}°C`;
    weatherCondition.textContent = data.weather[0].description;
    humidity.textContent = `${data.main.humidity}%`;
    windSpeed.textContent = `${data.wind.speed} m/s`;
    pressure.textContent = `${data.main.pressure} hPa`;
    visibility.textContent = `${(data.visibility / 1000).toFixed(1)} km`;
    
    // Update weather icon
    const iconCode = data.weather[0].icon;
    const iconClass = getWeatherIcon(iconCode);
    weatherIcon.className = `fas ${iconClass}`;
}

// Update forecast display
function updateForecast(data) {
    // Filter to get one forecast per day (every 24 hours)
    const dailyForecasts = [];
    const seenDays = new Set();
    
    data.list.forEach(forecast => {
        const date = new Date(forecast.dt * 1000);
        const day = date.toLocaleDateString('en-US', { weekday: 'short' });
        
        if (!seenDays.has(day) && date.getHours() === 12) { // Use noon forecast
            seenDays.add(day);
            dailyForecasts.push({
                day,
                temp: forecast.main.temp,
                feels_like: forecast.main.feels_like,
                description: forecast.weather[0].description,
                icon: forecast.weather[0].icon,
                temp_min: forecast.main.temp_min,
                temp_max: forecast.main.temp_max
            });
        }
    });
    
    // Display only next 5 days
    forecastContainer.innerHTML = dailyForecasts.slice(0, 5).map(day => `
        <div class="forecast-card">
            <div class="forecast-day">${day.day}</div>
            <i class="fas ${getWeatherIcon(day.icon)} forecast-icon"></i>
            <div class="condition">${day.description}</div>
            <div class="forecast-temp">
                <span class="temp-high">${Math.round(day.temp_max)}°C</span>
                <span class="temp-low">${Math.round(day.temp_min)}°C</span>
            </div>
        </div>
    `).join('');
}

// Map OpenWeatherMap icons to Font Awesome
function getWeatherIcon(iconCode) {
    const iconMap = {
        '01d': 'fa-sun',           // clear sky day
        '01n': 'fa-moon',          // clear sky night
        '02d': 'fa-cloud-sun',     // few clouds day
        '02n': 'fa-cloud-moon',    // few clouds night
        '03d': 'fa-cloud',         // scattered clouds
        '03n': 'fa-cloud',
        '04d': 'fa-cloud',         // broken clouds
        '04n': 'fa-cloud',
        '09d': 'fa-cloud-rain',    // shower rain
        '09n': 'fa-cloud-rain',
        '10d': 'fa-cloud-sun-rain',// rain day
        '10n': 'fa-cloud-moon-rain',// rain night
        '11d': 'fa-bolt',          // thunderstorm
        '11n': 'fa-bolt',
        '13d': 'fa-snowflake',     // snow
        '13n': 'fa-snowflake',
        '50d': 'fa-smog',          // mist
        '50n': 'fa-smog'
    };
    
    return iconMap[iconCode] || 'fa-cloud';
}

// Manage recent searches
function addToRecentSearches(city) {
    // Remove if already exists
    recentCities = recentCities.filter(c => c.toLowerCase() !== city.toLowerCase());
    
    // Add to beginning
    recentCities.unshift(city);
    
    // Keep only last 5
    recentCities = recentCities.slice(0, 5);
    
    // Save to localStorage
    localStorage.setItem('recentCities', JSON.stringify(recentCities));
    
    // Update display
    updateRecentSearches();
}

function updateRecentSearches() {
    if (recentCities.length > 0) {
        recentSearches.innerHTML = recentCities.map(city => `
            <div class="recent-item" onclick="fetchWeatherData('${city}')">
                ${city}
            </div>
        `).join('');
    } else {
        recentSearches.innerHTML = '<p class="no-recent">No recent searches</p>';
    }
}

// Loading modal functions
function showLoading() {
    loadingModal.style.display = 'flex';
}

function hideLoading() {
    loadingModal.style.display = 'none';
}

// Load default city on startup
window.addEventListener('DOMContentLoaded', () => {
    fetchWeatherData('London'); // Default city
});