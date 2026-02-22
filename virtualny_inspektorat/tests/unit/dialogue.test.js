import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DialogueEngine } from '../../js/dialogue.js';

describe('DialogueEngine', () => {
  let engine;
  let game;

  beforeEach(() => {
    vi.useFakeTimers();
    game = { dialogueActive: false };
    engine = new DialogueEngine(game);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('starts inactive', () => {
      expect(engine.active).toBe(false);
      expect(engine.currentDialogue).toBe(null);
    });
  });

  describe('start', () => {
    it('activates dialogue and sets state', () => {
      const dialogue = { nodes: [{ text: 'Hello' }] };
      engine.start(dialogue, vi.fn());
      expect(engine.active).toBe(true);
      expect(engine.currentDialogue).toBe(dialogue);
      expect(engine.currentNodeIndex).toBe(0);
      expect(game.dialogueActive).toBe(true);
    });

    it('adds active class to overlay', () => {
      engine.start({ nodes: [{ text: 'Hi' }] }, vi.fn());
      expect(engine.overlay.classList.contains('active')).toBe(true);
    });
  });

  describe('showNode', () => {
    it('ends dialogue when index exceeds nodes length', () => {
      const onComplete = vi.fn();
      engine.start({ nodes: [{ text: 'Only one' }] }, onComplete);
      // Skip typewriter to complete the first node
      vi.advanceTimersByTime(5000);

      engine.showNode(1); // index beyond length
      expect(engine.active).toBe(false);
      expect(onComplete).toHaveBeenCalledWith('completed');
    });

    it('sets speaker text from node', () => {
      engine.start({ nodes: [{ speaker: 'Oracle', text: 'Greetings' }] }, vi.fn());
      expect(engine.speakerEl.textContent).toBe('Oracle');
    });

    it('defaults speaker to empty string', () => {
      engine.start({ nodes: [{ text: 'No speaker' }] }, vi.fn());
      expect(engine.speakerEl.textContent).toBe('');
    });
  });

  describe('typeText', () => {
    it('types text character by character', () => {
      engine.start({ nodes: [{ text: 'ABC' }] }, vi.fn());
      // Initial state: typing is true
      expect(engine.typing).toBe(true);

      // After 30ms: first char
      vi.advanceTimersByTime(30);
      expect(engine.displayedText).toBe('A');

      // After 60ms: second char
      vi.advanceTimersByTime(30);
      expect(engine.displayedText).toBe('AB');

      // After 90ms: third char
      vi.advanceTimersByTime(30);
      expect(engine.displayedText).toBe('ABC');

      // After 120ms: done typing
      vi.advanceTimersByTime(30);
      expect(engine.typing).toBe(false);
    });
  });

  describe('finishTyping', () => {
    it('immediately completes text display', () => {
      engine.start({ nodes: [{ text: 'Long text here' }] }, vi.fn());
      expect(engine.typing).toBe(true);

      engine.finishTyping();
      expect(engine.typing).toBe(false);
      expect(engine.displayedText).toBe('Long text here');
      expect(engine.textEl.textContent).toBe('Long text here');
    });

    it('calls the onDone callback', () => {
      const onDone = vi.fn();
      engine.typeText('Hello', onDone);
      engine.finishTyping();
      expect(onDone).toHaveBeenCalledOnce();
    });
  });

  describe('selectChoice — correct answer', () => {
    it('ends with success when correct answer has no response', () => {
      const onComplete = vi.fn();
      const dialogue = {
        nodes: [{
          text: 'Question?',
          choices: [{ text: 'Right', correct: true }]
        }]
      };
      engine.start(dialogue, onComplete);
      engine.finishTyping();

      engine.selectChoice({ text: 'Right', correct: true }, 0);
      expect(onComplete).toHaveBeenCalledWith('success');
    });

    it('types response and sets pending success when correct answer has response', () => {
      const onComplete = vi.fn();
      const dialogue = {
        nodes: [{
          text: 'Question?',
          choices: [{ text: 'Right', correct: true, response: 'Correct!' }]
        }]
      };
      engine.start(dialogue, onComplete);
      engine.finishTyping();

      engine.selectChoice({ text: 'Right', correct: true, response: 'Correct!' }, 0);

      // Response is being typed
      engine.finishTyping();
      expect(engine._pendingSuccess).toBe(true);

      // Advancing should trigger success
      engine.advance();
      expect(onComplete).toHaveBeenCalledWith('success');
    });
  });

  describe('selectChoice — incorrect answer', () => {
    it('re-shows current node when incorrect with no response', () => {
      const dialogue = {
        nodes: [{
          speaker: 'Oracle',
          text: 'Question?',
          choices: [{ text: 'Wrong', correct: false }]
        }]
      };
      engine.start(dialogue, vi.fn());
      engine.finishTyping();

      const prevIndex = engine.currentNodeIndex;
      engine.selectChoice({ text: 'Wrong', correct: false }, 0);

      expect(engine.currentNodeIndex).toBe(prevIndex);
    });

    it('types response and sets pending retry when incorrect with response', () => {
      const dialogue = {
        nodes: [{
          text: 'Question?',
          choices: [{ text: 'Wrong', correct: false, response: 'Try again!' }]
        }]
      };
      engine.start(dialogue, vi.fn());
      engine.finishTyping();

      engine.selectChoice({ text: 'Wrong', correct: false, response: 'Try again!' }, 0);
      engine.finishTyping();
      expect(engine._pendingRetry).toBe(true);

      // Advancing should re-show the current node
      const nodeIndex = engine.currentNodeIndex;
      engine.advance();
      expect(engine.currentNodeIndex).toBe(nodeIndex);
    });
  });

  describe('selectChoice — goto', () => {
    it('jumps to specified node index', () => {
      const dialogue = {
        nodes: [
          { text: 'Node 0', choices: [{ text: 'Jump', goto: 2 }] },
          { text: 'Node 1' },
          { text: 'Node 2' }
        ]
      };
      engine.start(dialogue, vi.fn());
      engine.finishTyping();

      engine.selectChoice({ text: 'Jump', goto: 2 }, 0);
      expect(engine.currentNodeIndex).toBe(2);
    });
  });

  describe('selectChoice — neutral (no correct/goto)', () => {
    it('advances to next node', () => {
      const dialogue = {
        nodes: [
          { text: 'First', choices: [{ text: 'Continue' }] },
          { text: 'Second' }
        ]
      };
      engine.start(dialogue, vi.fn());
      engine.finishTyping();

      engine.selectChoice({ text: 'Continue' }, 0);
      expect(engine.currentNodeIndex).toBe(1);
    });
  });

  describe('advance', () => {
    it('follows node.next when defined', () => {
      const dialogue = {
        nodes: [
          { text: 'Node 0', next: 2 },
          { text: 'Node 1' },
          { text: 'Node 2' }
        ]
      };
      engine.start(dialogue, vi.fn());
      engine.finishTyping();

      engine.advance();
      expect(engine.currentNodeIndex).toBe(2);
    });

    it('advances to next sequential node when no next defined', () => {
      const dialogue = {
        nodes: [
          { text: 'Node 0' },
          { text: 'Node 1' }
        ]
      };
      engine.start(dialogue, vi.fn());
      engine.finishTyping();

      engine.advance();
      expect(engine.currentNodeIndex).toBe(1);
    });
  });

  describe('end', () => {
    it('deactivates dialogue state', () => {
      engine.start({ nodes: [{ text: 'Hi' }] }, vi.fn());
      engine.end('completed');

      expect(engine.active).toBe(false);
      expect(engine.currentDialogue).toBe(null);
      expect(game.dialogueActive).toBe(false);
    });

    it('removes active class from overlay', () => {
      engine.start({ nodes: [{ text: 'Hi' }] }, vi.fn());
      engine.end('completed');
      expect(engine.overlay.classList.contains('active')).toBe(false);
    });

    it('calls onComplete callback with result', () => {
      const onComplete = vi.fn();
      engine.start({ nodes: [{ text: 'Hi' }] }, onComplete);
      engine.end('success');
      expect(onComplete).toHaveBeenCalledWith('success');
    });
  });

  describe('full scenario — riddle dialogue', () => {
    it('completes a correct riddle flow', () => {
      const onComplete = vi.fn();
      const dialogue = {
        nodes: [
          { speaker: 'Oracle', text: 'What is 2+2?' ,
            choices: [
              { text: '4', correct: true, response: 'Well done!' },
              { text: '5', correct: false, response: 'Wrong!' }
            ]
          }
        ]
      };

      engine.start(dialogue, onComplete);
      engine.finishTyping(); // Skip typewriter for question

      // Select correct answer
      engine.selectChoice(dialogue.nodes[0].choices[0], 0);
      engine.finishTyping(); // Skip typewriter for response

      // Advance from response
      engine.advance();

      expect(onComplete).toHaveBeenCalledWith('success');
      expect(engine.active).toBe(false);
    });
  });
});
