
class ToneGenerator {
        _timeConstant = null;
        _frequency = null;
        _currentTime = null;

        constructor(frequency = 550, timeConstant = 0.001) {
            this._frequency = frequency;
            this._timeConstant = timeConstant;

            this._init(this.frequency);
        }

        _init(frequency) {
            this.audioContext = new AudioContext({latencyHint: "interactive"});
            this.oscillator = this.audioContext.createOscillator();
            this.oscillator.type = "sine";
            this.oscillator.frequency.value = frequency;

            this.gainNode = this.audioContext.createGain();
            this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);

            this.oscillator.connect(this.gainNode);
            this.gainNode.connect(this.audioContext.destination);
        }

        get frequency() {
            return this._frequency;
        }

        _oscillatorStarted() {
            return this.oscillator.context.state === 'running';
        }

        _startOscillator() {
            if (!this._oscillatorStarted()) {
                this.oscillator.start();
                console.log("oscillator started");
            }
        }

        startTone() {
            if (!this._oscillatorStarted()) {
                this._startOscillator();
            }
            this._currentTime = this.audioContext.currentTime;
            this.gainNode.gain.cancelScheduledValues(this._currentTime);
            this.gainNode.gain.setTargetAtTime(1, this._currentTime, this._timeConstant);
        }

        stopTone() {
            this._currentTime = this.audioContext.currentTime;
            this.gainNode.gain.cancelScheduledValues(this._currentTime);
            this.gainNode.gain.setTargetAtTime(0, this._currentTime, this._timeConstant);
        }
    }

class MorseDecoder {
    static CODE = {
        ".-": "A", "-...": "B", "-.-.": "C", "-..": "D",
        ".": "E", "..-.": "F", "--.": "G", "....": "H",
        "..": "I", ".---": "J", "-.-": "K", ".-..": "L",
        "--": "M", "-.": "N", "---": "O", ".--.": "P",
        "--.-": "Q", ".-.": "R", "...": "S", "-": "T",
        "..-": "U", "...-": "V", ".--": "W", "-..-": "X",
        "-.--": "Y", "--..": "Z",
        "-----": "0", ".----": "1", "..---": "2", "...--": "3",
        "....-": "4", ".....": "5", "-....": "6", "--...": "7",
        "---..": "8", "----.": "9"
    };

    static decode(code) {
        return code.slice(0, -1).trim().split(' / \n').map(line => line.trim().split('/').map(word => word.trim().split(' ').map(char => MorseDecoder.CODE[char.trim()] || '\u274C').join('')).join(' ')).join('\n');
    }

}

class MorseRecorder {
    _states = Object.freeze({
        idle: 0,
        keyDown: 1,
        dot: 2,
        dash: 3,
        keyUp: 4,
        characterSpace: 5,
        wordSpace: 6,
    });

    _events = Object.freeze({
        keyDown: 0,
        keyUp: 1,
        timeout: 2
    });

    events = Object.freeze({
        recordChange: "record-change",
        characterComplete: "character-complete"
    });

    _timeout = null;
    _record = '';
    _currentState = this._states.idle;

    constructor(wpm = 12) {
        this.timeUnit = 1200 / wpm;
        this._currentState = this._states.idle;
    }

    get record(){
        return this._record;
    }

    get state(){
        return this._currentState;
    }

    _appendRecord(symbol){
        this._record += symbol;
        dispatchEvent(new CustomEvent(this.events.recordChange));

        if (symbol === " "){
            dispatchEvent(new CustomEvent(this.events.characterComplete));
        }
    }

    _correctRecord(symbol){
        this._record = this._record.slice(0, -1) + symbol;

        dispatchEvent(new CustomEvent(this.events.recordChange));
    }

    onRecordChange(callback) {
        addEventListener(this.events.recordChange, callback);
    }

    onCharacterComplete(callback) {
        addEventListener(this.events.characterComplete, callback);
    }

    triggerKeyDown(){
        this._trigger(this._events.keyDown);
    }

    triggerKeyUp(){
        this._trigger(this._events.keyUp);
    }

    _trigger(event) {
        switch (this._currentState) {
            case this._states.idle:
                if (event === this._events.keyDown) {
                    this._switch(this._states.keyDown);
                }
                break;
            case this._states.keyDown:
                if (event === this._events.keyUp) {
                    this._switch(this._states.keyUp);
                } else if (event === this._events.timeout) {
                    this._switch(this._states.dot);
                }
                break;
            case this._states.dot:
                if (event === this._events.keyUp) {
                    this._switch(this._states.keyUp);
                } else if (event === this._events.timeout) {
                    this._switch(this._states.dash);
                }
                break;
            case this._states.dash:
                if (event === this._events.keyUp) {
                    this._switch(this._states.keyUp);
                }
                break;
            case this._states.keyUp:
                if (event === this._events.timeout) {
                    this._switch(this._states.characterSpace);
                } else if (event === this._events.keyDown) {
                    this._switch(this._states.keyDown);
                }
                break;
            case this._states.characterSpace:
                if (event === this._events.keyDown) {
                    this._switch(this._states.keyDown);
                } else if (event === this._events.timeout) {
                    this._switch(this._states.wordSpace);
                }
                break;
            case this._states.wordSpace:
                if (event === this._events.keyDown) {
                    this._switch(this._states.keyDown);
                } else if (event === this._events.timeout) {
                    this._switch(this._states.idle);
                }
                break;
            case this._states.NEW_LINE:
                break;
        }
    }

    _switch (state) {
        this._currentState = state;
        this._enter(state);
    }

    _startTimeout(delay){
        this._timeout = setTimeout(() => {
            this._trigger(this._events.timeout);
        }, this.timeUnit * delay);
    }

    _stopTimeout() {
        clearTimeout(this._timeout);
    }

    _enter(state) {
        switch (state) {
            case this._states.idle:
                this._stopTimeout();
                this._appendRecord("\n");
                break;
            case this._states.keyDown:
                this._stopTimeout();
                this._startTimeout(1);
                break;
            case this._states.dot:
                this._startTimeout(2);
                this._appendRecord(".");
                break;
            case this._states.dash:
                this._correctRecord("-");
                break;
            case this._states.keyUp:
                this._stopTimeout();
                this._startTimeout(3);
                break;
            case this._states.characterSpace:
                this._startTimeout(4);
                this._appendRecord(" ");
                break;
            case this._states.wordSpace:
                this._startTimeout(10);
                this._appendRecord("/ ");
                break;
        }
    }
}