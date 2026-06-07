class StateMachine {
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
        DASH: "dash",
        DOT: "dot",
        CHARACTER_SPACE: "character-space",
        WORD_SPACE: "word-space",
        NEW_LINE: "new-line"
    });

    dashEvent = new CustomEvent(this.Events.DASH);
    dotEvent = new CustomEvent(this.Events.DOT);
    characterSpaceEvent = new CustomEvent(this.Events.CHARACTER_SPACE);
    wordSpaceEvent = new CustomEvent(this.Events.WORD_SPACE);
    newLineEvent = new CustomEvent(this.Events.NEW_LINE);

    timeout = null;

    constructor(timeUnit = 100) {
        this.timeUnit = timeUnit;
        this.currentState = this.States.IDLE;
    }

    transition(event) {
        switch (this.currentState) {
            case this.States.IDLE:
                if (event === this.Trigger.KEY_DOWN) {
                    this.switch(this.States.KEY_DOWN);
                }
                break;
            case this.States.KEY_DOWN:
                if (event === this.Trigger.KEY_UP) {
                    this.switch(this.States.KEY_UP);
                } else if (event === this.Trigger.TIMEOUT) {
                    this.switch(this.States.DOT);
                }
                break;
            case this.States.DOT:
                if (event === this.Trigger.KEY_UP) {
                    this.switch(this.States.KEY_UP);
                } else if (event === this.Trigger.TIMEOUT) {
                    this.switch(this.States.DASH);
                }
                break;
            case this.States.DASH:
                if (event === this.Trigger.KEY_UP) {
                    this.switch(this.States.KEY_UP);
                }
                break;
            case this.States.KEY_UP:
                if (event === this.Trigger.TIMEOUT) {
                    this.switch(this.States.CHARACTER_SPACE);
                } else if (event === this.Trigger.KEY_DOWN) {
                    this.switch(this.States.KEY_DOWN);
                }
                break;
            case this.States.CHARACTER_SPACE:
                if (event === this.Trigger.KEY_DOWN) {
                    this.switch(this.States.KEY_DOWN);
                } else if (event === this.Trigger.TIMEOUT) {
                    this.switch(this.States.WORD_SPACE);
                }
                break;
            case this.States.WORD_SPACE:
                if (event === this.Trigger.KEY_DOWN) {
                    this.switch(this.States.KEY_DOWN);
                } else if (event === this.Trigger.TIMEOUT) {
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
            this.transition(this.Trigger.TIMEOUT);
        }, this.timeUnit * delay);
    }

    stopTimeout() {
        clearTimeout(this.timeout);
    }

    enter(state) {
        switch (state) {
            case this.States.IDLE:
                this.stopTimeout();
                dispatchEvent(this.newLineEvent);
                break;
            case this.States.KEY_DOWN:
                this.stopTimeout();
                this.startTimeout(1);
                break;
            case this.States.DOT:
                this.startTimeout(2);
                dispatchEvent(this.dotEvent);
                break;
            case this.States.DASH:
                dispatchEvent(this.dashEvent);
                break;
            case this.States.KEY_UP:
                this.stopTimeout();
                this.startTimeout(3);
                break;
            case this.States.CHARACTER_SPACE:
                dispatchEvent(this.characterSpaceEvent);
                this.startTimeout(4);
                break;
            case this.States.WORD_SPACE:
                dispatchEvent(this.wordSpaceEvent);
                this.startTimeout(10);
                break;
        }
    }
}