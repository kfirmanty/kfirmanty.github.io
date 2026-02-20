export class DialogueEngine {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.currentDialogue = null;
    this.currentNodeIndex = 0;
    this.typewriterTimer = null;
    this.fullText = '';
    this.displayedText = '';
    this.typing = false;
    this.onComplete = null;

    this.overlay = document.getElementById('dialogue-overlay');
    this.speakerEl = document.getElementById('dialogue-speaker');
    this.textEl = document.getElementById('dialogue-text');
    this.choicesEl = document.getElementById('dialogue-choices');
    this.continueEl = document.getElementById('dialogue-continue');

    document.addEventListener('click', () => {
      if (!this.active) return;
      if (this.typing) {
        this.finishTyping();
      } else if (this.currentDialogue) {
        this.advance();
      }
    });
  }

  start(dialogue, onComplete) {
    this.active = true;
    this.currentDialogue = dialogue;
    this.currentNodeIndex = 0;
    this.onComplete = onComplete;
    this.overlay.classList.add('active');
    this.game.dialogueActive = true;
    this.showNode(0);
  }

  showNode(index) {
    const nodes = this.currentDialogue.nodes;
    if (index >= nodes.length) {
      this.end('completed');
      return;
    }
    this.currentNodeIndex = index;
    const node = nodes[index];

    this.speakerEl.textContent = node.speaker || '';
    this.choicesEl.innerHTML = '';
    this.continueEl.style.display = 'none';

    if (node.choices && node.choices.length > 0) {
      this.typeText(node.text, () => {
        this.showChoices(node.choices);
      });
    } else {
      this.typeText(node.text, () => {
        this.continueEl.style.display = 'block';
      });
    }
  }

  typeText(text, onDone) {
    this.fullText = text;
    this.displayedText = '';
    this.typing = true;
    this.textEl.textContent = '';
    let i = 0;
    clearInterval(this.typewriterTimer);
    this.typewriterTimer = setInterval(() => {
      if (i < text.length) {
        this.displayedText += text[i];
        this.textEl.textContent = this.displayedText;
        i++;
      } else {
        this.typing = false;
        clearInterval(this.typewriterTimer);
        if (onDone) onDone();
      }
    }, 30);
  }

  finishTyping() {
    clearInterval(this.typewriterTimer);
    this.typing = false;
    this.displayedText = this.fullText;
    this.textEl.textContent = this.fullText;

    const node = this.currentDialogue.nodes[this.currentNodeIndex];
    if (node.choices && node.choices.length > 0) {
      this.showChoices(node.choices);
    } else {
      this.continueEl.style.display = 'block';
    }
  }

  showChoices(choices) {
    this.choicesEl.innerHTML = '';
    choices.forEach((choice, i) => {
      const btn = document.createElement('button');
      btn.className = 'dialogue-choice';
      btn.textContent = `▸ ${choice.text}`;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectChoice(choice, i);
      });
      this.choicesEl.appendChild(btn);
    });
  }

  selectChoice(choice, index) {
    if (choice.correct === true) {
      if (choice.response) {
        this.choicesEl.innerHTML = '';
        this.typeText(choice.response, () => {
          this.continueEl.style.display = 'block';
          // Mark that next advance should trigger success
          this._pendingSuccess = true;
        });
      } else {
        this.end('success');
      }
    } else if (choice.correct === false) {
      if (choice.response) {
        this.choicesEl.innerHTML = '';
        this.typeText(choice.response, () => {
          // Go back to the question
          this.continueEl.style.display = 'block';
          this._pendingRetry = true;
        });
      } else {
        // Just re-show the node
        this.showNode(this.currentNodeIndex);
      }
    } else if (choice.goto !== undefined) {
      this.showNode(choice.goto);
    } else {
      this.advance();
    }
  }

  advance() {
    if (this._pendingSuccess) {
      this._pendingSuccess = false;
      this.end('success');
      return;
    }
    if (this._pendingRetry) {
      this._pendingRetry = false;
      this.showNode(this.currentNodeIndex);
      return;
    }
    const node = this.currentDialogue.nodes[this.currentNodeIndex];
    if (node.next !== undefined) {
      this.showNode(node.next);
    } else {
      this.showNode(this.currentNodeIndex + 1);
    }
  }

  end(result) {
    this.active = false;
    this.currentDialogue = null;
    this.overlay.classList.remove('active');
    this.game.dialogueActive = false;
    clearInterval(this.typewriterTimer);
    if (this.onComplete) this.onComplete(result);
  }
}
