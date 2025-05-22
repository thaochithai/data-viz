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
    
    // Create charts
    createLengthByCountryChart();
    createElectrificationChart();
    createPassengerVolumeChart();
    createNetworkDensityChart();
}

// Update overview statistics cards
function updateOverviewStats() {
    try {
        // Calculate total countries
        const totalCountries = countryData.length;
        document.getElementById('total-countries').textContent = totalCountries;
        
        // Calculate total railway length (assuming column exists)
        const totalLength = countryData.reduce((sum, row) => {
            const length = parseFloat(row.total_train_length) || 0;
            return sum + length;
        }, 0);
        document.getElementById('total-length').textContent = totalLength.toLocaleString();
        
        // Calculate electrification percentage
        const totalElectrified = countryData.reduce((sum, row) => {
            const electrified = parseFloat(row.electrified_train_length) || 0;
            return sum + electrified;
        }, 0);
        const electrificationPercentage = totalLength > 0 ? Math.round((totalElectrified / totalLength) * 100) : 0;
        document.getElementById('electrified-percentage').textContent = electrificationPercentage + '%';
        
        // Calculate total passenger-km
        const totalPassengerKm = countryData.reduce((sum, row) => {
            const pkm = parseFloat(row.MIO_PKM) || 0;
            return sum + pkm;
        }, 0);
        document.getElementById('total-passenger-km').textContent = Math.round(totalPassengerKm).toLocaleString();
        
        console.log('Overview stats updated');
    } catch (error) {
        console.error('Error updating overview stats:', error);
    }
}

// Create Railway Length by Country Chart
function createLengthByCountryChart() {
    try {
        const ctx = document.getElementById('lengthByCountryChart').getContext('2d');
        
        // Get top 10 countries by railway length
        const sortedData = countryData
            .map(row => ({
                country: row.Country,
                length: parseFloat(row.total_train_length) || 0
            }))
            .filter(d => d.length > 0)
            .sort((a, b) => b.length - a.length)
            .slice(0, 10);
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedData.map(d => d.country),
                datasets: [{
                    label: 'Railway Length (km)',
                    data: sortedData.map(d => d.length),
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
                        title: {
                            display: true,
                            text: 'Length (km)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Country'
                        }
                    }
                }
            }
        });
        
        console.log('Railway length chart created');
    } catch (error) {
        console.error('Error creating railway length chart:', error);
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