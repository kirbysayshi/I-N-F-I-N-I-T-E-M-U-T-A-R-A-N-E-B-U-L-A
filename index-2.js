var debug = (prefix) => localStorage[prefix]
  ? (fmt, ...params) => {
    console.log(Date.now() + ' ' + prefix + ': ' + fmt, ...params);
  }
  : () => {};

var applyStyle = (el, props) => {
  Object.keys(props).forEach(name => {
    el.style[name] = props[name];
  });
  return el;
}

var o_o = (name, props={}, children=[]) => {
  var el = document.createElement(name);
  var ref;
  Object.keys(props).forEach(name => {
    // Ref callbacks to ease... getting a ref
    if (name == 'ref' && typeof props[name] === 'function') {
      ref = props[name];
    }
    if (name === 'style') {
      applyStyle(el, props[name]);
    } else {
      // Attributes
      if (
        name === 'for'
        || name === 'type'
        || name === 'selected'
        || name === 'checked'
      ) {
        if (props[name]) {
          el.setAttribute(name, props[name]);
        } else {
          // Attributes must be removed, not just set to false.
          el.removeAttribute(name);
        }
      } else {
        // An actual prop.
        el[name] = props[name];
      }
    }
  });
  children.forEach(child => {
    if (child instanceof Element) el.appendChild(child);
    else {
      var t = document.createElement('text');
      t.textContent = child;
      el.appendChild(t);
    }
  })
  // Only call the ref callback once the children are there.
  if (ref) ref(el);
  return el;
}

var Boot = () => {

  var urlFromBuffer = (buf) => window.URL.createObjectURL(
    new Blob([buf], { type: 'video/mp4' })
  );

  var videoFromUrl = (url) => {
    return new Promise((resolve, reject) => {
      var v = document.createElement('video');
      var onloaded = () => {
        v.removeEventListener('loadedmetadata', onloaded);
        resolve(v);
      }
      v.addEventListener('loadedmetadata', onloaded);
      v.src = url;
    })
  };

  var clips = [
    ["clips/clip-1.mp4", 0, 0],
    ["clips/clip-2.mp4", 0, 0],
    ["clips/clip-3.mp4", 0, 0],
    ["clips/clip-4.mp4", 0, 0],
    ["clips/clip-5.mp4", 0, 0],
    ["clips/clip-6.mp4", 0, 0],
    ["clips/clip-7.mp4", 0, 0],
    ["clips/clip-8.mp4", 0, 0],
  ].map(([url, startTime, endTime]) => fetch(url)
    .then(res => res.arrayBuffer())
    .then(buf => urlFromBuffer(buf))
    .then(url => videoFromUrl(url))
    .then(video => ({
      video,
      startTime,
      endTime: endTime || video.duration,
    }))
  );

  return Promise.all(clips);
};

var dbg = debug('mutara');

function CheckboxEl (label, onchange) {
  return o_o('label', {
    style: { display: 'block', }
  }, [
    o_o('input', {
      type: 'checkbox',
      onchange,
      style: {
        verticalAlign: 'middle',
      }
    }),
    o_o('span', {
      style: {
        verticalAlign: 'middle',
      }
    }, [label]),
  ])
}

class Scheduler {

  constructor (onEmpty) {
    this.onEmpty = onEmpty;
    this.processPoll = 100;
    this.queue = [];
    this.scheduled = null;
    this.runningTime = 0;
    this.lastTime = 0;
  }

  _process () {

    if (!this.queue.length) {
      dbg('queue is empty')
      this.onEmpty((cb, duration) => {
        this.queueEvent({ cb, duration });
      });

      this.runningTime = 0;
      this._process();
    } else {
      const [item] = this.queue;

      if (this.runningTime === 0) {
        dbg('start of item lifetime')
        item.cb();
      }

      this.runningTime += Date.now() - this.lastTime;

      if (this.runningTime >= item.duration - this.processPoll) {
        dbg('item has expired. runningTime %d, duration %d', this.runningTime, item.duration);
        this.skip();
      }
    }

    this.start();
  }

  skip () {
    dbg('skipping current queue item');
    this.queue.shift();
    this.runningTime = 0;
  }

  queueEvent (ev) {
    this.queue.push(ev);
  }

  start () {
    clearTimeout(this.scheduled);
    this.lastTime = Date.now();
    this.scheduled = setTimeout(() => this._process(), this.processPoll);
  }

  pause () {
    clearTimeout(this.scheduled);
  }
}

class App {

  constructor (clips) {
    this.state = {
      clips,
      controls: {},
      controlsFade: null,
      controlsFadeDelay: 1000,
      root: null,
      options: {
        random2sec: false,
        sound: false,
      },
      scheduler: null,
    }
  }

  mount (root) {
    this.state.root = root;

    var font = '9px/12px Arial, sans-serif';

    applyStyle(this.state.root, {
      position: 'relative',
      height: '100vh',
      overflow: 'hidden',
    });

    var clipsDiv = o_o('div', {
      style: {
        position: 'absolute',
        left: '0px',
        top: '0px',
        width: '100%',
        height: '100%',
      },
    }, [
      ...this.state.clips.map(clip => {
        return applyStyle(clip.video, {
          position: 'absolute',
          top: '-999999px',
          right: '-999999px',
          bottom: '-999999px',
          left: '-999999px',
          minHeight: '100%',
          minWidth: '100%',
          margin: 'auto',
        })
      })
    ]);

    this.state.root.appendChild(clipsDiv);

    var controlsDiv = o_o('div', {
      className: 'controls',
      ref: (el) => { this.state.controls.panel = el; },
      style: {
        position: 'absolute',
        left: '20px',
        top: '20px',
        padding: '10px',
        transition: 'opacity 1s ease-out 0s',
        zIndex: this.state.clips.length + 1,
        backgroundColor: '#333333',
        color: 'white',
        font,
      }
    }, [
      o_o('div', {
        className: 'btn-wrap',
        style: {
          position: 'relative',
          width: '50px',
          height: '50px',
          margin: 'auto',
        }
      }, [
        o_o('button', {
          className: 'play-btn',
          ref: el => { this.state.controls.playBtn = el },
          onclick: () => this.togglePlay(),
          style: {
            font,
            textAlign: 'center',
            color: '#333333',
            padding: '0',
            margin: '0',
            width: '100%',
            height: '100%',
            border: '2px solid #333333',
            borderRadius: '100% 100% 100% 100%',
          }
        }),
      ]),

      o_o('div', {
        style: {
          paddingTop: '10px',
        }
      }, [
        CheckboxEl('RANDOM 2 SECONDS', ({ target: { checked } }) => {
          this.state.options.random2sec = !!checked;
          this.state.scheduler.skip();
        }),
        CheckboxEl('SOUND', ({ target: { checked } }) => {
          this.state.options.sound = !!checked;
          this.toggleSound();
        }),
      ]),

      o_o('p', {}, [
        `TODO: copyright / fair use`
      ])
    ]);

    this.state.root.onmousemove = () => this.showControls();
    this.state.root.onclick = () => this.showControls();

    this.state.root.appendChild(controlsDiv);

    this.state.scheduler = new Scheduler((queue) => {
      var next = this.chooseNext();
      var plot = this.plotClipTime(next, this.state.options);
      queue(() => {
        // Without this event we get visual delays.
        var onseeked = (e) => {
          next.video.onseeked = null;
          var curr = this.getActive();
          curr.video.pause();
          next.video.play();
          this.bringToFront(next);
        };
        next.video.onseeked = onseeked;
        next.video.currentTime = plot.startTime;
      }, plot.duration * 1000)
    });

    this.state.scheduler.start();

    this.toggleSound();
    this.showControls();
    this.play();
  }

  chooseNext () {
    var { clips } = this.state;
    var active = this.getActive();

    var next = active;

    while (next === active) {
      next = clips[Math.floor(Math.random() * clips.length)];
    }

    return next;
  }

  bringToFront (clip) {
    var { clips } = this.state;
    clips.forEach((clip, i) => applyStyle(clip.video, {
      zIndex: i
    }));
    applyStyle(clip.video, { zIndex: clips.length });
  }

  getActive () {
    var { clips } = this.state;
    return clips.sort((a, b) => b.video.style.zIndex - a.video.style.zIndex)[0];
  }

  plotClipTime (clip, options) {
    var {
      endTime,
      startTime,
      video: { currentTime, duration }
    } = clip;

    var plot = {
      startTime: startTime,
      endTime: endTime,
      duration: 0,
    };

    if (options.random2sec) {
      var min = 2;
      plot.startTime = (endTime - startTime - min) * Math.random();
      plot.endTime = plot.startTime + min;
    }

    plot.duration = plot.endTime - plot.startTime;

    dbg('plot %o for clip %o', plot, clip);
    return plot;
  }

  pause () {
    this.state.controls.playBtn.innerHTML = '&#9654;';
    this.state.scheduler.pause();
    return this.getActive().video.pause();
  }

  play () {
    this.state.controls.playBtn.innerHTML = '&#9646;&#9646;';
    this.state.scheduler.start();
    return this.getActive().video.play();
  }

  isPaused () {
    var { video } = this.getActive();
    if (video.paused) { return true }
    else { return false }
  }

  togglePlay () {
    if (this.isPaused()) {
      this.play();
    } else {
      this.pause();
    }
  }

  toggleSound () {
    var { sound } = this.state.options;
    var { clips } = this.state;
    clips.forEach(({ video }) => {
      video.volume = sound ? 1 : 0;
    });
  }

  showControls () {
    var { panel } = this.state.controls;
    if (this.state.controlsFade) clearTimeout(this.state.controlsFade);
    panel.style.opacity = '1';
    this.state.controlsFade = setTimeout(() => {
      var { panel } = this.state.controls;
      panel.style.opacity = '0';
      this.state.controlsFade = null;
    }, this.state.controlsFadeDelay);
  }
}

Boot().then(clips => {
  var app = new App(clips);
  app.mount(document.querySelector('#stage'));
});

