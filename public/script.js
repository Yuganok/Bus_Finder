// Элементы DOM
const regionInput = document.getElementById('regionInput');
const regionSuggestions = document.getElementById('regionSuggestions');
const stopInput = document.getElementById('stopInput');
const stopSuggestions = document.getElementById('stopSuggestions');
const resultsDiv = document.getElementById('results');
const clearButton = document.getElementById('clearButton');
const busDetailsDiv = document.getElementById('busDetails');
const locationButton = document.getElementById('locationButton');

// Глобальные переменные для данных
let regions = [];
let stops = [];
let activeBus = null;
let selectedBus = null

// Функция: Загрузить регионы
async function loadRegions() {
    try {
        const response = await fetch('https://api-qcau3zbyoq-uc.a.run.app/regions');
        regions = await response.json();
    } catch (error) {
        busDetailsDiv.innerHTML = "<p>Ошибка загрузки данных.</p>";
    }
}

// Функция: Очистить все поля
function clearFields(excludeRegion = false) {
    if (!excludeRegion) {
        regionInput.value = '';
    }
    stopInput.value = '';
    stopInput.disabled = true;
    regionSuggestions.innerHTML = '';
    stopSuggestions.innerHTML = '';
    resultsDiv.innerHTML = '';
    busDetailsDiv.innerHTML = '';
    activeBus = null;
}

// Кнопка "Очистить"
clearButton.addEventListener('click', () => clearFields());

// Функция: Обновить подсказки
function updateSuggestions(inputElement, suggestionsContainer, items, onClick) {
  const query = inputElement.value.toLowerCase();
  suggestionsContainer.innerHTML = '';

  const filteredItems = items.filter(item => item.toLowerCase().startsWith(query));

  filteredItems.forEach(item => {
      const li = document.createElement('li');
      li.textContent = item;
      li.className = 'list-group-item';
      li.addEventListener('click', () => {
          inputElement.value = item;
          suggestionsContainer.style.display = 'none';
          onClick(item);
      });
      suggestionsContainer.appendChild(li);
  });

  suggestionsContainer.style.display = filteredItems.length > 0 ? 'block' : 'none';
}


// Фокус и подсказки для регионов
regionInput.addEventListener('focus', () => {
    updateSuggestions(regionInput, regionSuggestions, regions, region => {
        clearFields(true);
        regionInput.value = region;
        loadStops(region);
    });
});

// Фокус и подсказки для остановок
stopInput.addEventListener('focus', () => {
    if (!regionInput.value) {
        stopSuggestions.style.display = 'none';
        return;
    }
    const region = regionInput.value;
    updateSuggestions(stopInput, stopSuggestions, stops, stop => {
        stopInput.value = stop;
        loadBuses(stop, region);
    });
});

// Подсказки для регионов
regionInput.addEventListener('input', () => {
    updateSuggestions(regionInput, regionSuggestions, regions, region => {
        clearFields(true);
        regionInput.value = region;
        loadStops(region);
    });
});

// Подсказки для остановок
stopInput.addEventListener('input', () => {
    if (!regionInput.value) {
        stopSuggestions.style.display = 'none';
        return;
    }
    const region = regionInput.value;
    updateSuggestions(stopInput, stopSuggestions, stops, stop => {
        stopInput.value = stop;
        loadBuses(stop, region);
    });
});

// Потеря фокуса: скрытие подсказок
regionInput.addEventListener('blur', () => {
    setTimeout(() => regionSuggestions.style.display = 'none', 200);
});
stopInput.addEventListener('blur', () => {
    setTimeout(() => stopSuggestions.style.display = 'none', 200);
});

// Функция: Загрузить остановки
async function loadStops(region) {
    try {
        const response = await fetch(`https://api-qcau3zbyoq-uc.a.run.app/stops?region=${region}`);
        stops = await response.json();
        console.log(`Остановки для региона ${region}:`, stops);

        stopSuggestions.innerHTML = '';
        stopInput.disabled = false;
    } catch (error) {
        console.error('Ошибка загрузки остановок:', error);
    }
}

// Функция для обновления стиля активной кнопки
function updateSelectedBusUI(bus) {
    const busButtons = document.querySelectorAll("#results ul li button");
    busButtons.forEach((button) => {
        if (button.textContent.trim() === bus.trim()) { 
            button.classList.add("active");
        } else {
            button.classList.remove("active");
        }
    });
}

// Функция: Загрузить автобусы
async function loadBuses(stop, region) { 
    try {
        resultsDiv.innerHTML = '<p>Загрузка данных...</p>';
        busDetailsDiv.innerHTML = ''; 

        // Передача региона и остановки в запросе к API
        const response = await fetch(`https://api-qcau3zbyoq-uc.a.run.app/buses?stop=${stop}&region=${region}`);
        let buses = await response.json();

        // Сортируем автобусы в алфавитно-числовом порядке
        buses.sort((a, b) => {
            const regex = /(\d+)|(\D+)/g;
            const aParts = a.match(regex) || [];
            const bParts = b.match(regex) || [];

            for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
                const aPart = aParts[i] || '';
                const bPart = bParts[i] || '';

                if (!isNaN(aPart) && !isNaN(bPart)) {
                    const diff = parseInt(aPart) - parseInt(bPart);
                    if (diff !== 0) return diff;
                } else if (aPart !== bPart) {
                    return aPart.localeCompare(bPart);
                }
            }
            return 0;
        });

        resultsDiv.innerHTML = '<h3>Автобусы:</h3>';
        const busList = document.createElement('ul');

        buses.forEach(bus => {
            const listItem = document.createElement('li');
            const button = document.createElement('button');
            button.textContent = bus;
            button.className = 'btn btn-primary m-2';

            button.addEventListener('click', () => {
                loadBusDetails(bus, stop);

                const busButtons = document.querySelectorAll('#results ul li button');
                busButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
            });

            listItem.appendChild(button);
            busList.appendChild(listItem);
        });

        resultsDiv.appendChild(busList);
    } catch (error) {
        busDetailsDiv.innerHTML = "<p>Произошла ошибка при загрузке данных.</p>";
    }
}

function formatDirection(detail) {
    const direction = detail.trip_headsign || detail.route_long_name;
    const nextStop = detail.next_stop;
    const routeNumber = detail.route_short_name;
    const routeName = detail.route_long_name;
    return {
        routeNumber,
        routeName,
        nextStop,
        direction
    };
}

// Функция: Загрузить детали автобуса
async function loadBusDetails(bus, stop) {
    try {
        if (activeBus !== bus) {
            activeBus = bus;
            busDetailsDiv.innerHTML = '<p>Загрузка данных...</p>'; 
        } else {
            return; 
        }

        const response = await fetch(`https://api-qcau3zbyoq-uc.a.run.app/bus-details?bus=${bus}&stop=${stop}`);
        const details = await response.json();

        if (!details || details.length === 0) {
            busDetailsDiv.innerHTML = "<p>Нет данных для выбранного автобуса.</p>";
            return;
        }

        selectedBus = bus;
        updateSelectedBusUI(bus);

        const uniqueDetails = Array.from(
            new Map(details.map(detail => [
                `${detail.arrival_time}_${detail.trip_headsign}_${detail.route_long_name}_${detail.next_stop}`,
                detail
            ])).values()
        );

        const groupedDetails = uniqueDetails.reduce((groups, detail) => {
            const direction = detail.trip_long_name || detail.trip_headsign || detail.route_long_name;
            if (!groups[direction]) {
                groups[direction] = [];
            }
            groups[direction].push(detail);
            return groups;
        }, {});

        busDetailsDiv.innerHTML = "";

        for (const direction in groupedDetails) {
            const today = new Date();
            const currentTime = today.toTimeString().slice(0, 5);

            const todayDetails = groupedDetails[direction].filter(
                detail => detail.arrival_time >= currentTime
            );
            const nextDayDetails = groupedDetails[direction].filter(
                detail => detail.arrival_time < currentTime
            );

            let totalDetails = [...todayDetails];

            if (totalDetails.length < 5) {
                const remainingSlots = 5 - totalDetails.length;
                totalDetails = [...totalDetails, ...nextDayDetails.slice(0, remainingSlots)];
            }

            totalDetails = totalDetails.slice(0, 5);

            // Получаем следующую и конечную остановки
            const nextStop = groupedDetails[direction][0].next_stop;

            const directionList = totalDetails.map((detail, index) => {
                const isNextDay = index >= todayDetails.length;
                return `
                    <li>
                        <span class="arrival-time">${detail.arrival_time}</span>
                        ${isNextDay ? '<span class="next-day">(Завтра)</span>' : ''}
                    </li>
                `;
            });

            busDetailsDiv.innerHTML += `
                <div class="route-direction">
                    <div class="direction-info">
                        <div class="route-header">
                            <span class="route-destination">${direction}</span>
                        </div>
                        <div class="route-details">
                            <span class="next-stop">Следующая остановка: ${nextStop}</span>
                        </div>
                    </div>
                    <ul class="time-list">${directionList.join("")}</ul>
                </div>
            `;
        }
    } catch (error) {
        busDetailsDiv.innerHTML = "<p>Произошла ошибка при загрузке данных.</p>";
    }
}

// Функция определения местоположения
async function findNearestStop() {
    if ('geolocation' in navigator) {
        busDetailsDiv.innerHTML = '<p>Определение местоположения...</p>';
        
        const options = {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 5000
        };

        navigator.geolocation.getCurrentPosition(async position => {
            const { latitude, longitude } = position.coords;

            try {
                const response = await fetch(`https://api-qcau3zbyoq-uc.a.run.app/nearest?lat=${latitude}&lon=${longitude}`);
                const data = await response.json();

                regionInput.value = data.region;
                stopInput.value = data.stop;
                stopInput.disabled = false;
                loadBuses(data.stop, data.region);
            } catch (error) {
                busDetailsDiv.innerHTML = "<p>Ошибка определения местоположения.</p>";
            }
        }, error => {
            if (error.code === error.PERMISSION_DENIED) {
                busDetailsDiv.innerHTML = `
                    <div class="alert alert-warning" role="alert">
                        <p>Для автоматического определения ближайшей остановки необходим доступ к геолокации.</p>
                        <p>Вы можете выбрать регион и остановку вручную или разрешить доступ к местоположению.</p>
                    </div>`;
            }
        }, options);
    } else {
        busDetailsDiv.innerHTML = "<p>Геолокация не поддерживается вашим браузером.</p>";
    }
}

// Добавляем обработчик для кнопки геолокации
locationButton.addEventListener('click', findNearestStop);

// Загрузка данных при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    loadRegions();
    clearFields();

    if ('geolocation' in navigator) {
        const options = {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 5000
        };

        navigator.geolocation.getCurrentPosition(async position => {
            const { latitude, longitude } = position.coords;

            try {
                const response = await fetch(`https://api-qcau3zbyoq-uc.a.run.app/nearest?lat=${latitude}&lon=${longitude}`);
                const data = await response.json();

                regionInput.value = data.region;
                stopInput.value = data.stop;
                stopInput.disabled = false;
                const region = data.region;
                loadBuses(data.stop, region);
            } catch (error) {
                busDetailsDiv.innerHTML = "<p>Ошибка определения местоположения.</p>";
            }
        }, error => {
            if (error.code === error.PERMISSION_DENIED) {
                busDetailsDiv.innerHTML = `
                    <div class="alert alert-warning" role="alert">
                        <p>Для автоматического определения ближайшей остановки необходим доступ к геолокации.</p>
                        <p>Вы можете выбрать регион и остановку вручную или разрешить доступ к местоположению.</p>
                    </div>`;
            }
        }, options);
    }
});
