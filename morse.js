
class ToneGenerator {
        TIME_CONSTANT = 0.001;
        currentTime = null;

        constructor(frequency = 550) {
            this.audioContext = new AudioContext();
            this.oscillator = this.audioContext.createOscillator();
            this.oscillator.type = "sine";
            this.oscillator.frequency.value = frequency;

            this.gainNode = this.audioContext.createGain();
            this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);

            this.oscillator.connect(this.gainNode);
            this.gainNode.connect(this.audioContext.destination);

            console.log("ToneGenerator initialized");
        }

        oscillatorStarted() {
            return this.oscillator.context.state === 'running';
        }

        startOscillator() {
            if (!this.oscillatorStarted()) {
                this.oscillator.start();
                console.log("oscillator started");
            }
        }

        startTone() {
            if (!this.oscillatorStarted()) {
                this.startOscillator();
            }
            this.currentTime = this.audioContext.currentTime;
            this.gainNode.gain.cancelScheduledValues(this.currentTime);
            this.gainNode.gain.setTargetAtTime(1, this.currentTime, this.TIME_CONSTANT);
        }

        stopTone() {
            this.currentTime = this.audioContext.currentTime;
            this.gainNode.gain.cancelScheduledValues(this.currentTime);
            this.gainNode.gain.setTargetAtTime(0, this.currentTime, this.TIME_CONSTANT);
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
    States = Object.freeze({
        IDLE: 0,
        KEY_DOWN: 1,
        DOT: 2,
        DASH: 3,
        KEY_UP: 4,
        CHARACTER_SPACE: 5,
        WORD_SPACE: 6,
    });

    Trigger = Object.freeze({
        KEY_DOWN: 0,
        KEY_UP: 1,
        TIMEOUT: 2
    });

    Events = Object.freeze({
        RECORD_CHANGE: "record-change",
        CHARACTER_COMPLETE: "character-complete"
    });

    recordChangeEvent = new CustomEvent(this.Events.RECORD_CHANGE);
    characterCompleteEvent = new CustomEvent(this.Events.CHARACTER_COMPLETE);

    timeout = null;
    record = '';

    constructor(wpm = 12) {
        this.timeUnit = 1200 / wpm;
        this.currentState = this.States.IDLE;
    }

    appendRecord(symbol){
        this.record += symbol;
        dispatchEvent(this.recordChangeEvent);

        if (symbol === " "){
            dispatchEvent(this.characterCompleteEvent)
        }
    }

    correctRecord(symbol){
        this.record = this.record.slice(0, -1) + symbol;

        dispatchEvent(this.recordChangeEvent);
    }

    trigger(trigger) {
        switch (this.currentState) {
            case this.States.IDLE:
                if (trigger === this.Trigger.KEY_DOWN) {
                    this.switch(this.States.KEY_DOWN);
                }
                break;
            case this.States.KEY_DOWN:
                if (trigger === this.Trigger.KEY_UP) {
                    this.switch(this.States.KEY_UP);
                } else if (trigger === this.Trigger.TIMEOUT) {
                    this.switch(this.States.DOT);
                }
                break;
            case this.States.DOT:
                if (trigger === this.Trigger.KEY_UP) {
                    this.switch(this.States.KEY_UP);
                } else if (trigger === this.Trigger.TIMEOUT) {
                    this.switch(this.States.DASH);
                }
                break;
            case this.States.DASH:
                if (trigger === this.Trigger.KEY_UP) {
                    this.switch(this.States.KEY_UP);
                }
                break;
            case this.States.KEY_UP:
                if (trigger === this.Trigger.TIMEOUT) {
                    this.switch(this.States.CHARACTER_SPACE);
                } else if (trigger === this.Trigger.KEY_DOWN) {
                    this.switch(this.States.KEY_DOWN);
                }
                break;
            case this.States.CHARACTER_SPACE:
                if (trigger === this.Trigger.KEY_DOWN) {
                    this.switch(this.States.KEY_DOWN);
                } else if (trigger === this.Trigger.TIMEOUT) {
                    this.switch(this.States.WORD_SPACE);
                }
                break;
            case this.States.WORD_SPACE:
                if (trigger === this.Trigger.KEY_DOWN) {
                    this.switch(this.States.KEY_DOWN);
                } else if (trigger === this.Trigger.TIMEOUT) {
                    this.switch(this.States.IDLE);
                }
                break;
            case this.States.NEW_LINE:
                break;
        }
    }

    switch (state) {
        this.currentState = state;
        this.enter(state);
    }

    startTimeout(delay){
        this.timeout = setTimeout(() => {
            this.trigger(this.Trigger.TIMEOUT);
        }, this.timeUnit * delay);
    }

    stopTimeout() {
        clearTimeout(this.timeout);
    }

    enter(state) {
        switch (state) {
            case this.States.IDLE:
                this.stopTimeout();
                this.appendRecord("\n");
                break;
            case this.States.KEY_DOWN:
                this.stopTimeout();
                this.startTimeout(1);
                break;
            case this.States.DOT:
                this.startTimeout(2);
                this.appendRecord(".");
                break;
            case this.States.DASH:
                this.correctRecord("-");
                break;
            case this.States.KEY_UP:
                this.stopTimeout();
                this.startTimeout(3);
                break;
            case this.States.CHARACTER_SPACE:
                this.startTimeout(4);
                this.appendRecord(" ");
                break;
            case this.States.WORD_SPACE:
                this.startTimeout(10);
                this.appendRecord("/ ");
                break;
        }
    }
}