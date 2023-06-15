'use strict';

// prettier-ignore

// GETTING LOCATION FROM BROWSER
// 1st parameter -> on success
// 2nd parameter -> on failed
let map;
let mapEvent;

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coordinates, distance, duration) {
    this.coordinates = coordinates; // [lat, long]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = [
      'January','February','March','April','May','June','July','August','September','October','November','December',
    ];

    this.description = `${this.activityType[0].toUpperCase()}${this.activityType.slice(
      1
    )} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  activityType = 'running';

  constructor(coordinates, distance, duration, cadence) {
    super(coordinates, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // Pace in min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  activityType = 'cycling';

  constructor(coordinates, distance, duration, elevationGain) {
    super(coordinates, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const running1 = new Running([39, -12], 6.4, 43, 181);
// const cycling1 = new Cycling([39, -12], 23, 102, 458);
// console.log(running1, cycling1);

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

/////////////////////////
// APPLICATION ARCHITECTURE
class App {
  #map;
  #zoomMap = 14;
  #mapEvent;
  #workout = [];

  constructor() {
    // Get users position
    // Immediately call the _getPosition when the class is created.
    this._getPosition();

    // Get data from the local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevation);
    containerWorkouts.addEventListener('click', this._moveToMarker.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Cannot found current location!');
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);
    // console.log(this);

    const coordinates = [latitude, longitude];

    // L -> Namespace with multiple methods
    this.#map = L.map('map').setView(coordinates, this.#zoomMap);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // method from leaflet || handling clicks from map
    this.#map.on('click', this._showForm.bind(this));

    // We call this method here because we want to wait for the map to load first.
    this.#workout.forEach(workout => {
      this._renderWorkoutMarker(workout);
    });
  }

  _showForm(mapEvt) {
    this.#mapEvent = mapEvt;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Empty our inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => {
      form.style.display = 'grid';
    }, 900);
  }

  _toggleElevation() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(event) {
    const validateInputs = (...inputs) =>
      inputs.every(val => Number.isFinite(val));
    const allPositive = (...inputs) => inputs.every(val => val > 0);

    event.preventDefault();

    // Get data from the form
    const activityType = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout is running, create Running object
    if (activityType === 'running') {
      const cadence = +inputCadence.value;
      // Data validation
      if (
        !validateInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Input must be a positive number!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout is cycling, create Cycling object
    if (activityType === 'cycling') {
      const elevation = +inputElevation.value;
      // Data validation
      if (
        !validateInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Input must be a positive number!');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add the new object into the workout arr
    this.#workout.push(workout);
    // console.log(workout);

    // Render workout on the map as maker

    // View documentation
    // L.popup -> max,min width
    // autoClose -> default: true
    // className -> apply css style to popup
    // setPopupContent -> set content to the popup
    this._renderWorkoutMarker(workout);

    // Render workout on the list
    this._renderWorkout(workout);

    // Clear input fields
    this._hideForm();

    // Set local storage in the browser
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coordinates)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 220,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.activityType}-popup`,
        })
      )
      .setPopupContent(
        `${workout.activityType === 'running' ? '🏃' : '🚴'} ${
          workout.description
        }`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.activityType}" data-id="${
      workout.id
    }">
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.activityType === 'running' ? '🏃' : '🚴'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>
    `;

    if (workout.activityType === 'running') {
      html += `<div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pace.toFixed(2)}</span>
      <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">👟</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>`;
    }
    if (workout.activityType === 'cycling') {
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(2)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevationGain}</span>
        <span class="workout__unit">m</span>
      </div>`;
    }
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToMarker(event) {
    const workoutEl = event.target.closest('.workout');
    // console.log(workoutEl);

    if (!workoutEl) return;

    const workout = this.#workout.find(w => w.id === workoutEl.dataset.id);

    this.#map.setView(workout.coordinates, this.#zoomMap, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // using the public interface
    // workout.click();
  }

  _setLocalStorage() {
    // key, value storage
    localStorage.setItem('workouts', JSON.stringify(this.#workout));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;
    this.#workout = data;
    this.#workout.forEach(workout => {
      this._renderWorkout(workout);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload(); // reload our page once the local storage is resetted.
  }
}

const app = new App();
