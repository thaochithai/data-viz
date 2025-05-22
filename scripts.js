// European Train Dashboard - Main JavaScript File

// Global variables to store loaded data
let countryData = [];
let operatorsData = [];
let comparisonData = [];
let routeData = [];

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard initializing...');
    console.log('D3 version:', d3.version);
    console.log('Chart.js loaded:', typeof Chart !== 'undefined');
    
    // Load all CSV data
    loadAllData();
});

// Tab switching functionality
function showTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected tab content
    document.getElementById(tabName).classList.add('active');
    
    // Add active class to clicked button
    event.target.classList.add('active');
    
    console.log(`Switched to ${tabName} tab`);
}

// Load all CSV data files
async function loadAllData() {
    try {
        console.log('Loading CSV data...');
        
        // Load all CSV files
        const [countries, operators, comparison, routes] = await Promise.all([
            d3.csv('data/country_passenger_km_train_length.csv'),
            d3.csv('data/operators.csv'),
            d3.csv('data/train_operators_comparison.csv'),
            d3.csv('data/route_breakdown.csv')
        ]);
        
        // Store data globally
        countryData = countries;
        operatorsData = operators;
        comparisonData = comparison;
        routeData = routes;
        
        console.log('Data loaded successfully:');
        console.log('Countries:', countryData.length, 'rows');
        console.log('Operators:', operatorsData.length, 'rows');
        console.log('Comparison:', comparisonData.length, 'rows');
        console.log('Routes:', routeData.length, 'rows');
        
        // Process and display data
        processOverviewData();
        processOperatorData();
        
    } catch (error) {
        console.error('Error loading data:', error);
        showErrorMessage('Failed to load data. Please check if CSV files are in the correct location.');
    }
}

// Process and display overview data (Tab 1)
function processOverviewData() {
    console.log('Processing overview data...');
    
    // Calculate key statistics
    updateOverviewStats();
    
    // Create the new charts
    createTop5CountriesChart();
    updateOperatorsList();
    
    // Initialize interactive map (placeholder for now)
    initializeInteractiveMap();
}

// Update overview statistics cards
function updateOverviewStats() {
    try {
        // Calculate total railway length
        const totalLength = countryData.reduce((sum, row) => {
            const electrified = parseFloat(row.electrified_train_length) || 0;
            const nonElectrified = parseFloat(row.non_electrified_train_length) || 0;
            return sum + electrified + nonElectrified;
        }, 0);
        document.getElementById('total-length').textContent = Math.round(totalLength).toLocaleString() + ' km';
        
        // Calculate total passenger-km
        const totalPassengerKm = countryData.reduce((sum, row) => {
            const pkm = parseFloat(row.MIO_PKM) || 0;
            return sum + pkm;
        }, 0);
        document.getElementById('total-passenger-km').textContent = Math.round(totalPassengerKm).toLocaleString() + ' M';
        
        // Calculate electrification percentage (electrified / (electrified + non_electrified))
        const totalElectrified = countryData.reduce((sum, row) => {
            const electrified = parseFloat(row.electrified_train_length) || 0;
            return sum + electrified;
        }, 0);
        const electrificationPercentage = totalLength > 0 ? Math.round((totalElectrified / totalLength) * 100) : 0;
        document.getElementById('electrified-percentage').textContent = electrificationPercentage + '%';
        
        // Count total unique operators
        const uniqueOperators = new Set(operatorsData.map(row => row.Operator)).size;
        document.getElementById('total-operators').textContent = uniqueOperators;
        
        console.log('Overview stats updated with new calculations');
    } catch (error) {
        console.error('Error updating overview stats:', error);
    }
}

// Create Top 5 Countries Chart (New Design)
function createTop5CountriesChart() {
    try {
        const ctx = document.getElementById('top5CountriesChart').getContext('2d');
        
        // Calculate combined metric: passenger volume for top 5 countries
        const countryMetrics = countryData
            .map(row => {
                const passengerKm = parseFloat(row.MIO_PKM) || 0;
                const electrified = parseFloat(row.electrified_train_length) || 0;
                const nonElectrified = parseFloat(row.non_electrified_train_length) || 0;
                const totalLength = electrified + nonElectrified;
                
                return {
                    country: row.Country,
                    passengerKm: passengerKm,
                    totalLength: totalLength,
                    code: row.Code
                };
            })
            .filter(d => d.passengerKm > 0)
            .sort((a, b) => b.passengerKm - a.passengerKm)
            .slice(0, 5);
        
        // Store top 5 countries globally for operators list
        window.top5Countries = countryMetrics;
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: countryMetrics.map(d => d.country),
                datasets: [{
                    data: countryMetrics.map(d => d.passengerKm),
                    backgroundColor: '#bbebd3',
                    borderColor: '#bbebd3',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: 'white'
                        },
                        grid: {
                            color: 'rgba(255,255,255,0.2)'
                        }
                    },
                    x: {
                        ticks: {
                            color: 'white'
                        },
                        grid: {
                            color: 'rgba(255,255,255,0.2)'
                        }
                    }
                },
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const country = countryMetrics[index];
                        updateOperatorsListForCountry(country.country);
                    }
                }
            }
        });
        
        console.log('Top 5 countries chart created');
    } catch (error) {
        console.error('Error creating top 5 countries chart:', error);
    }
}

// Update operators list based on selected country
function updateOperatorsList() {
    try {
        const operatorsList = document.getElementById('operators-by-country');
        
        // Get operators from top 5 countries
        if (window.top5Countries && window.top5Countries.length > 0) {
            const topCountries = window.top5Countries.map(c => c.country);
            
            // Find operators that operate in these countries
            const relevantOperators = operatorsData
                .filter(row => topCountries.includes(row.Operate_in_country))
                .map(row => row.Operator)
                .filter((operator, index, self) => self.indexOf(operator) === index) // unique operators
                .slice(0, 6); // limit to 6 operators
            
            operatorsList.innerHTML = relevantOperators
                .map(operator => `<li>${operator}</li>`)
                .join('');
        } else {
            // Default operators list
            const defaultOperators = operatorsData
                .map(row => row.Operator)
                .filter((operator, index, self) => self.indexOf(operator) === index)
                .slice(0, 6);
            
            operatorsList.innerHTML = defaultOperators
                .map(operator => `<li>${operator}</li>`)
                .join('');
        }
        
        console.log('Operators list updated');
    } catch (error) {
        console.error('Error updating operators list:', error);
    }
}

// Update operators list for specific country (when chart is clicked)
function updateOperatorsListForCountry(countryName) {
    try {
        const operatorsList = document.getElementById('operators-by-country');
        
        // Find operators for this specific country
        const countryOperators = operatorsData
            .filter(row => row.Operate_in_country === countryName)
            .map(row => row.Operator)
            .filter((operator, index, self) => self.indexOf(operator) === index)
            .slice(0, 8);
        
        if (countryOperators.length > 0) {
            operatorsList.innerHTML = countryOperators
                .map(operator => `<li>${operator}</li>`)
                .join('');
        }
        
        console.log(`Updated operators list for ${countryName}`);
    } catch (error) {
        console.error('Error updating operators list for country:', error);
    }
}

// Initialize interactive map (with basic SVG map)
function initializeInteractiveMap() {
    try {
        const mapContainer = document.getElementById('europe-map');
        
        // Create SVG map container
        const svgMap = `
        <div class="svg-map-container">
            <svg viewBox="0 0 800 600" class="europe-map-svg">
                <!-- European Countries (simplified paths) -->
                <g class="countries">
                    <!-- Germany -->
                    <path d="M 350 250 L 380 240 L 390 270 L 380 300 L 350 290 Z" 
                          class="country" data-country="Germany" fill="#4a7c59" stroke="#237644" stroke-width="2"/>
                    <text x="365" y="270" class="country-label">DE</text>
                    
                    <!-- France -->
                    <path d="M 280 280 L 320 270 L 340 310 L 300 320 L 270 300 Z" 
                          class="country" data-country="France" fill="#4a7c59" stroke="#237644" stroke-width="2"/>
                    <text x="300" y="295" class="country-label">FR</text>
                    
                    <!-- Italy -->
                    <path d="M 380 320 L 400 310 L 420 360 L 400 380 L 380 360 Z" 
                          class="country" data-country="Italy" fill="#4a7c59" stroke="#237644" stroke-width="2"/>
                    <text x="400" y="345" class="country-label">IT</text>
                    
                    <!-- Spain -->
                    <path d="M 220 340 L 280 330 L 290 370 L 240 380 L 210 360 Z" 
                          class="country" data-country="Spain" fill="#4a7c59" stroke="#237644" stroke-width="2"/>
                    <text x="250" y="355" class="country-label">ES</text>
                    
                    <!-- United Kingdom -->
                    <path d="M 280 200 L 310 190 L 320 220 L 300 240 L 270 230 Z" 
                          class="country" data-country="United Kingdom" fill="#4a7c59" stroke="#237644" stroke-width="2"/>
                    <text x="295" y="215" class="country-label">UK</text>
                    
                    <!-- Poland -->
                    <path d="M 420 220 L 450 210 L 460 240 L 440 260 L 410 250 Z" 
                          class="country" data-country="Poland" fill="#4a7c59" stroke="#237644" stroke-width="2"/>
                    <text x="435" y="235" class="country-label">PL</text>
                    
                    <!-- Netherlands -->
                    <path d="M 340 220 L 360 210 L 370 235 L 350 245 L 330 235 Z" 
                          class="country" data-country="Netherlands" fill="#4a7c59" stroke="#237644" stroke-width="2"/>
                    <text x="350" y="230" class="country-label">NL</text>
                    
                    <!-- Belgium -->
                    <path d="M 320 240 L 340 235 L 350 250 L 330 260 L 310 255 Z" 
                          class="country" data-country="Belgium" fill="#4a7c59" stroke="#237644" stroke-width="2"/>
                    <text x="335" y="248" class="country-label">BE</text>
                    
                    <!-- Switzerland -->
                    <path d="M 360 290 L 380 285 L 390 305 L 370 315 L 350 310 Z" 
                          class="country" data-country="Switzerland" fill="#4a7c59" stroke="#237644" stroke-width="2"/>
                    <text x="370" y="300" class="country-label">CH</text>
                    
                    <!-- Austria -->
                    <path d="M 390 280 L 430 275 L 440 295 L 410 305 L 380 300 Z" 
                          class="country" data-country="Austria" fill="#4a7c59" stroke="#237644" stroke-width="2"/>
                    <text x="415" y="290" class="country-label">AT</text>
                </g>
            </svg>
            
            <!-- Country Info Panel -->
            <div id="country-info" class="country-info-panel">
                <h4 id="country-name">Select a country</h4>
                <div class="country-stats">
                    <div class="stat-item">
                        <span class="stat-label">Railway Length:</span>
                        <span id="country-length">-</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Passenger-KM:</span>
                        <span id="country-passenger">-</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">% Electrified:</span>
                        <span id="country-electrified">-</span>
                    </div>
                </div>
            </div>
        </div>
        `;
        
        mapContainer.innerHTML = svgMap;
        
        // Add interactivity to countries
        const countries = document.querySelectorAll('.country');
        countries.forEach(country => {
            country.addEventListener('mouseenter', function() {
                this.style.fill = '#bbebd3';
                this.style.cursor = 'pointer';
                showCountryInfo(this.dataset.country);
            });
            
            country.addEventListener('mouseleave', function() {
                this.style.fill = '#4a7c59';
            });
            
            country.addEventListener('click', function() {
                selectCountry(this.dataset.country);
            });
        });
        
        console.log('Interactive SVG map initialized');
    } catch (error) {
        console.error('Error initializing interactive map:', error);
    }
}

// Show country information when hovering
function showCountryInfo(countryName) {
    try {
        const countryData_item = countryData.find(row => 
            row.Country === countryName || 
            row.Country.toLowerCase().includes(countryName.toLowerCase())
        );
        
        if (countryData_item) {
            const electrified = parseFloat(countryData_item.electrified_train_length) || 0;
            const nonElectrified = parseFloat(countryData_item.non_electrified_train_length) || 0;
            const totalLength = electrified + nonElectrified;
            const electrificationPercentage = totalLength > 0 ? Math.round((electrified / totalLength) * 100) : 0;
            const passengerKm = parseFloat(countryData_item.MIO_PKM) || 0;
            
            document.getElementById('country-name').textContent = countryName;
            document.getElementById('country-length').textContent = Math.round(totalLength).toLocaleString() + ' km';
            document.getElementById('country-passenger').textContent = Math.round(passengerKm).toLocaleString() + ' M';
            document.getElementById('country-electrified').textContent = electrificationPercentage + '%';
        } else {
            document.getElementById('country-name').textContent = countryName;
            document.getElementById('country-length').textContent = 'No data';
            document.getElementById('country-passenger').textContent = 'No data';
            document.getElementById('country-electrified').textContent = 'No data';
        }
    } catch (error) {
        console.error('Error showing country info:', error);
    }
}

// Select country and update operators list
function selectCountry(countryName) {
    console.log(`Selected country: ${countryName}`);
    updateOperatorsListForCountry(countryName);
    
    // Highlight selected country
    const countries = document.querySelectorAll('.country');
    countries.forEach(country => {
        country.style.stroke = '#237644';
        country.style.strokeWidth = '2';
    });
    
    const selectedCountry = document.querySelector(`[data-country="${countryName}"]`);
    if (selectedCountry) {
        selectedCountry.style.stroke = '#ffffff';
        selectedCountry.style.strokeWidth = '3';
    }
}

// Create Electrification Status Chart
function createElectrificationChart() {
    try {
        const ctx = document.getElementById('electrificationChart').getContext('2d');
        
        // Calculate total electrified vs non-electrified
        let totalElectrified = 0;
        let totalNonElectrified = 0;
        
        countryData.forEach(row => {
            const electrified = parseFloat(row.electrified_train_length) || 0;
            const nonElectrified = parseFloat(row.non_electrified_train_length) || 0;
            totalElectrified += electrified;
            totalNonElectrified += nonElectrified;
        });
        
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Electrified', 'Non-Electrified'],
                datasets: [{
                    data: [totalElectrified, totalNonElectrified],
                    backgroundColor: ['#4A7C59', '#A8D5A3'],
                    borderColor: ['#2D5A27', '#4A7C59'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
        
        console.log('Electrification chart created');
    } catch (error) {
        console.error('Error creating electrification chart:', error);
    }
}

// Create Passenger Volume Chart
function createPassengerVolumeChart() {
    try {
        const ctx = document.getElementById('passengerVolumeChart').getContext('2d');
        
        // Get top 10 countries by passenger volume
        const sortedData = countryData
            .map(row => ({
                country: row.Country,
                volume: parseFloat(row.MIO_PKM) || 0
            }))
            .filter(d => d.volume > 0)
            .sort((a, b) => b.volume - a.volume)
            .slice(0, 10);
        
        new Chart(ctx, {
            type: 'horizontalBar',
            data: {
                labels: sortedData.map(d => d.country),
                datasets: [{
                    label: 'Million Passenger-KM',
                    data: sortedData.map(d => d.volume),
                    backgroundColor: '#A8D5A3',
                    borderColor: '#4A7C59',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Million Passenger-KM'
                        }
                    }
                }
            }
        });
        
        console.log('Passenger volume chart created');
    } catch (error) {
        console.error('Error creating passenger volume chart:', error);
    }
}

// Create Network Density Chart
function createNetworkDensityChart() {
    try {
        const ctx = document.getElementById('networkDensityChart').getContext('2d');
        
        // Calculate network density (passenger-km per km of track) for countries with both data
        const densityData = countryData
            .map(row => {
                const length = parseFloat(row.total_train_length) || 0;
                const volume = parseFloat(row.MIO_PKM) || 0;
                const density = length > 0 ? volume / length : 0;
                
                return {
                    country: row.Country,
                    density: density
                };
            })
            .filter(d => d.density > 0)
            .sort((a, b) => b.density - a.density)
            .slice(0, 10);
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: densityData.map(d => d.country),
                datasets: [{
                    label: 'Passenger-KM per KM of Track',
                    data: densityData.map(d => d.density.toFixed(2)),
                    backgroundColor: '#2D5A27',
                    borderColor: '#4A7C59',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Efficiency Ratio'
                        }
                    }
                }
            }
        });
        
        console.log('Network density chart created');
    } catch (error) {
        console.error('Error creating network density chart:', error);
    }
}

// Process and display operator comparison data (Tab 2)
function processOperatorData() {
    console.log('Processing operator data...');
    
    // Create operator comparison charts
    createOnTimeChart();
    createCancellationChart();
    createSpeedChart();
    createAmenitiesChart();
    createPoliciesChart();
    createLanguageChart();
    createPricingChart();
    createSpecialServicesChart();
}

// Create On-Time Performance Chart
function createOnTimeChart() {
    try {
        const ctx = document.getElementById('onTimeChart').getContext('2d');
        
        // Get operators with on-time data
        const onTimeData = comparisonData
            .map(row => ({
                operator: row.operator,
                onTime: parseFloat(row.on_time_percentage) || 0
            }))
            .filter(d => d.onTime > 0)
            .sort((a, b) => b.onTime - a.onTime);
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: onTimeData.map(d => d.operator),
                datasets: [{
                    label: 'On-Time Percentage',
                    data: onTimeData.map(d => d.onTime),
                    backgroundColor: '#4A7C59',
                    borderColor: '#2D5A27',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Percentage (%)'
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45
                        }
                    }
                }
            }
        });
        
        console.log('On-time performance chart created');
    } catch (error) {
        console.error('Error creating on-time chart:', error);
    }
}

// Create Cancellation Rate Chart
function createCancellationChart() {
    try {
        const ctx = document.getElementById('cancellationChart').getContext('2d');
        
        // Get operators with cancellation data
        const cancellationData = comparisonData
            .map(row => ({
                operator: row.operator,
                cancellation: parseFloat(row.cancellation_rate) || 0
            }))
            .filter(d => d.cancellation >= 0)
            .sort((a, b) => a.cancellation - b.cancellation);
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: cancellationData.map(d => d.operator),
                datasets: [{
                    label: 'Cancellation Rate',
                    data: cancellationData.map(d => d.cancellation),
                    backgroundColor: '#A8D5A3',
                    borderColor: '#4A7C59',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Cancellation Rate (%)'
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45
                        }
                    }
                }
            }
        });
        
        console.log('Cancellation rate chart created');
    } catch (error) {
        console.error('Error creating cancellation chart:', error);
    }
}

// Create Average Speed Chart
function createSpeedChart() {
    try {
        const ctx = document.getElementById('speedChart').getContext('2d');
        
        // Get operators with speed data
        const speedData = comparisonData
            .map(row => ({
                operator: row.operator,
                speed: parseFloat(row.average_speed) || 0
            }))
            .filter(d => d.speed > 0)
            .sort((a, b) => b.speed - a.speed);
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: speedData.map(d => d.operator),
                datasets: [{
                    label: 'Average Speed (km/h)',
                    data: speedData.map(d => d.speed),
                    backgroundColor: '#2D5A27',
                    borderColor: '#4A7C59',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Speed (km/h)'
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45
                        }
                    }
                }
            }
        });
        
        console.log('Speed chart created');
    } catch (error) {
        console.error('Error creating speed chart:', error);
    }
}

// Create Digital Amenities Chart
function createAmenitiesChart() {
    try {
        const ctx = document.getElementById('amenitiesChart').getContext('2d');
        
        // Count amenities (WiFi, electricity plug)
        let wifiCount = 0;
        let plugCount = 0;
        let totalOperators = comparisonData.length;
        
        comparisonData.forEach(row => {
            if (row.Wifi && row.Wifi.toLowerCase() === 'yes') wifiCount++;
            if (row.electricity_plug && row.electricity_plug.toLowerCase() === 'yes') plugCount++;
        });
        
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['WiFi Available', 'No WiFi', 'Power Plugs', 'No Power Plugs'],
                datasets: [{
                    data: [wifiCount, totalOperators - wifiCount, plugCount, totalOperators - plugCount],
                    backgroundColor: ['#4A7C59', '#C8E6C9', '#2D5A27', '#A8D5A3'],
                    borderColor: '#2D5A27',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
        
        console.log('Amenities chart created');
    } catch (error) {
        console.error('Error creating amenities chart:', error);
    }
}

// Placeholder functions for remaining charts
function createPoliciesChart() {
    console.log('Policies chart placeholder - implement based on your specific needs');
}

function createLanguageChart() {
    console.log('Language chart placeholder - implement based on your specific needs');
}

function createPricingChart() {
    console.log('Pricing chart placeholder - implement based on route data');
}

function createSpecialServicesChart() {
    console.log('Special services chart placeholder - implement based on your specific needs');
}

// Error handling
function showErrorMessage(message) {
    console.error(message);
    // You could show an error message in the UI here
    alert('Error: ' + message);
}

// Utility function to safely parse numbers
function safeParseFloat(value, defaultValue = 0) {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
}