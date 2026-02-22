export class AnimationSystem {
  constructor() {
    this.animations = []; // { object, property, fn(time, object) }
  }

  clear() {
    this.animations = [];
  }

  add(object, updateFn) {
    this.animations.push({ object, update: updateFn });
  }

  tick(time, delta) {
    this.animations = this.animations.filter(anim => {
      return anim.update(time, delta, anim.object) !== false;
    });
  }
}
