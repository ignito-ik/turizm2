/**
 * УПРАВЛЕНИЕ МОБИЛЬНЫМ МЕНЮ
 */

// Функция для открытия/закрытия меню при нажатии на "бургер"
function mobileMenu() {
    // Ищем элемент <navbar> на странице
    var navbar = document.getElementsByTagName("navbar")[0];
    
    // Если навигация не найдена, прерываем выполнение функции
    if (!navbar) return;

    // Переключаем класс "mobile": если его нет — добавляем (меню откроется),
    // если он есть — удаляем (меню закроется)
    navbar.classList.toggle("mobile");
}

// Ждем полной загрузки структуры документа (DOM), прежде чем вешать обработчики
document.addEventListener("DOMContentLoaded", function () {
    var navbar = document.getElementsByTagName("navbar")[0];
    initAudioWidget();
    setupMailtoForms();

    if (!navbar) return;

    // Находим все ссылки внутри навигации
    var links = navbar.getElementsByTagName("a");
    
    // Циклом проходим по каждой ссылке
    for (var i = 0; i < links.length; i++) {
        // Добавляем событие клика на каждую ссылку
        links[i].addEventListener("click", function () {
            // Если ширина экрана меньше или равна 800px (мобильный вид),
            // то при клике на ссылку закрываем меню (удаляем класс "mobile")
            // Это нужно, чтобы меню не перекрывало контент после перехода по якорю
            if (window.innerWidth <= 800) {
                navbar.classList.remove("mobile");
            }
        });
    }

    // Следим за изменением размера окна браузера
    window.addEventListener("resize", function () {
        // Если пользователь растянул окно больше 800px, 
        // принудительно убираем мобильный класс, чтобы избежать багов верстки
        if (window.innerWidth > 800) {
            navbar.classList.remove("mobile");
        }
    });
});


/**
 * ГАЛЕРЕЯ 
 */

// Функция для открытия картинки на весь экран
// Принимает в качестве аргумента (img) сам элемент картинки, на которую нажали
function openImage(img) {
    // Делаем модальное окно видимым (используем flex для центрирования)
    document.getElementById("modal").style.display = "flex";
    
    // Берем путь к картинке (src) у маленького изображения 
    // и подставляем его в большое изображение внутри модального окна
    document.getElementById("modal-img").src = img.src;
}

// Функция для закрытия модального окна
function closeImage() {
    // Просто скрываем элемент с id "modal"
    document.getElementById("modal").style.display = "none";
}


/**
 * МИНИ-ПЛЕЕР С ФОНОВОЙ МЕЛОДИЕЙ
 */

var audioContext = null;
var masterGain = null;
var melodyTimer = null;
var melodyStep = 0;
var musicPlaying = false;
var musicMuted = false;
var musicVolume = 0.35;

var melody = [
    { freq: 392.0, duration: 0.32 },
    { freq: 493.88, duration: 0.32 },
    { freq: 587.33, duration: 0.42 },
    { freq: 659.25, duration: 0.42 },
    { freq: 587.33, duration: 0.32 },
    { freq: 493.88, duration: 0.32 },
    { freq: 440.0, duration: 0.5 },
    { freq: 392.0, duration: 0.4 },
    { freq: 440.0, duration: 0.32 },
    { freq: 493.88, duration: 0.32 },
    { freq: 523.25, duration: 0.45 },
    { freq: 493.88, duration: 0.35 }
];

function initAudioWidget() {
    if (document.getElementById("audio-widget")) return;

    var savedVolume = localStorage.getItem("skyway-volume");
    var savedMuted = localStorage.getItem("skyway-muted");
    var savedHidden = localStorage.getItem("skyway-audio-hidden");

    if (savedVolume !== null) {
        musicVolume = Math.min(Math.max(parseFloat(savedVolume), 0), 1);
    }

    if (savedMuted === "true") {
        musicMuted = true;
    }

    var widget = document.createElement("div");
    widget.id = "audio-widget";
    widget.className = "audio-widget";

    if (savedHidden !== "false") {
        widget.classList.add("audio-widget-hidden");
    }

    widget.innerHTML =
        '<div class="audio-widget-header">' +
            '<div class="audio-widget-title">Мелодия сайта</div>' +
            '<button id="music-hide" type="button" class="audio-hide-btn" aria-label="Скрыть плеер">Скрыть</button>' +
        '</div>' +
        '<div class="audio-widget-controls">' +
            '<button id="music-toggle" type="button" class="audio-btn">Включить</button>' +
            '<button id="music-mute" type="button" class="audio-btn audio-btn-secondary">Без звука</button>' +
        '</div>' +
        '<label class="audio-volume-label" for="music-volume">Громкость</label>' +
        '<input id="music-volume" class="audio-volume" type="range" min="0" max="100" value="' + Math.round(musicVolume * 100) + '">' +
        '<div id="music-status" class="audio-status">Музыка выключена</div>' +
        '<button id="music-show" type="button" class="audio-widget-reopen" aria-label="Показать плеер">Музыка</button>';

    document.body.appendChild(widget);

    document.getElementById("music-toggle").addEventListener("click", toggleMusicPlayback);
    document.getElementById("music-mute").addEventListener("click", toggleMusicMute);
    document.getElementById("music-volume").addEventListener("input", changeMusicVolume);
    document.getElementById("music-hide").addEventListener("click", hideAudioWidget);
    document.getElementById("music-show").addEventListener("click", showAudioWidget);

    updateAudioWidgetState();
}

function ensureAudioContext() {
    if (audioContext) return;

    var AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return;

    audioContext = new AudioContextClass();
    masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);
    applyVolume();
}

function toggleMusicPlayback() {
    if (musicPlaying) {
        stopMelody();
    } else {
        startMelody();
    }
}

function toggleMusicMute() {
    musicMuted = !musicMuted;
    localStorage.setItem("skyway-muted", musicMuted);
    applyVolume();
    updateAudioWidgetState();
}

function changeMusicVolume(event) {
    musicVolume = Number(event.target.value) / 100;
    localStorage.setItem("skyway-volume", musicVolume);
    applyVolume();
    updateAudioWidgetState();
}

function applyVolume() {
    if (!masterGain || !audioContext) return;

    masterGain.gain.cancelScheduledValues(audioContext.currentTime);
    masterGain.gain.setValueAtTime(musicMuted ? 0 : musicVolume, audioContext.currentTime);
}

function startMelody() {
    ensureAudioContext();

    if (!audioContext) return;

    audioContext.resume();
    musicPlaying = true;
    playMelodyStep();
    updateAudioWidgetState();
}

function stopMelody() {
    musicPlaying = false;

    if (melodyTimer) {
        clearTimeout(melodyTimer);
        melodyTimer = null;
    }

    updateAudioWidgetState();
}

function playMelodyStep() {
    if (!musicPlaying || !audioContext || !masterGain) return;

    var note = melody[melodyStep];
    melodyStep = (melodyStep + 1) % melody.length;

    if (note && note.freq) {
        playTone(note.freq, note.duration);
    }

    melodyTimer = setTimeout(playMelodyStep, ((note.duration || 0.35) + 0.08) * 1000);
}

function playTone(frequency, duration) {
    var oscillator = audioContext.createOscillator();
    var noteGain = audioContext.createGain();
    var startTime = audioContext.currentTime;
    var endTime = startTime + duration;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, startTime);

    noteGain.gain.setValueAtTime(0.0001, startTime);
    noteGain.gain.exponentialRampToValueAtTime(0.35, startTime + 0.05);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, endTime);

    oscillator.connect(noteGain);
    noteGain.connect(masterGain);

    oscillator.start(startTime);
    oscillator.stop(endTime + 0.02);
}

function updateAudioWidgetState() {
    var toggleButton = document.getElementById("music-toggle");
    var muteButton = document.getElementById("music-mute");
    var status = document.getElementById("music-status");

    if (!toggleButton || !muteButton || !status) return;

    toggleButton.textContent = musicPlaying ? "Выключить" : "Включить";
    muteButton.textContent = musicMuted ? "Со звуком" : "Без звука";

    if (!musicPlaying) {
        status.textContent = "Музыка выключена";
        return;
    }

    if (musicMuted || musicVolume === 0) {
        status.textContent = "Музыка играет без звука";
        return;
    }

    status.textContent = "Музыка играет";
}

function hideAudioWidget() {
    var widget = document.getElementById("audio-widget");
    if (!widget) return;

    widget.classList.add("audio-widget-hidden");
    localStorage.setItem("skyway-audio-hidden", "true");
}

function showAudioWidget() {
    var widget = document.getElementById("audio-widget");
    if (!widget) return;

    widget.classList.remove("audio-widget-hidden");
    localStorage.setItem("skyway-audio-hidden", "false");
}

function setupMailtoForms() {
    var forms = document.querySelectorAll("form[data-mailto]");

    for (var i = 0; i < forms.length; i++) {
        forms[i].addEventListener("submit", function (event) {
            event.preventDefault();

            if (!this.reportValidity()) return;

            var recipient = this.getAttribute("data-mailto");
            var subject = this.getAttribute("data-subject") || "Новое сообщение с сайта";
            var name = (this.elements["name"] && this.elements["name"].value || "").trim();
            var email = (this.elements["email"] && this.elements["email"].value || "").trim();
            var phone = (this.elements["phone"] && this.elements["phone"].value || "").trim();
            var message = (this.elements["message"] && this.elements["message"].value || "").trim();

            var bodyLines = [
                "Имя: " + name,
                "Email: " + email
            ];

            if (phone) {
                bodyLines.push("Телефон: " + phone);
            }

            bodyLines.push("", "Сообщение:", message);

            var body = bodyLines.join("\n");
            var gmailRecipient = this.getAttribute("data-gmail");

            if (gmailRecipient) {
                var gmailUrl = "https://mail.google.com/mail/?view=cm&fs=1" +
                    "&to=" + encodeURIComponent(gmailRecipient) +
                    "&su=" + encodeURIComponent(subject) +
                    "&body=" + encodeURIComponent(body);

                window.location.href = gmailUrl;
                return;
            }

            var mailtoUrl = "mailto:" + recipient +
                "?subject=" + encodeURIComponent(subject) +
                "&body=" + encodeURIComponent(body);

            window.location.href = mailtoUrl;
        });
    }
}
