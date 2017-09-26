var debug = (prefix) => localStorage[prefix]
  ? (fmt, ...params) => {
    console.log(prefix + ': ' + fmt, ...params);
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

class App {

  constructor (clips) {
    this.state = {
      clips,
      scheduled: null,
      controls: {},
      controlsFade: null,
      controlsFadeDelay: 1000,
      root: null,
      options: {
        random2sec: false,
        sound: false,
      }
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
        backgroundColor: 'black',
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
      CheckboxEl('RANDOM 2 SECONDS', ({ target: { checked } }) => {
        this.state.options.random2sec = !!checked;
        if (!this.isPaused()) {
          this.scheduleNext();
        }
      }),
      CheckboxEl('SOUND', ({ target: { checked } }) => {
        this.state.options.sound = !!checked;
        this.toggleSound();
      }),
      o_o('p', {}, [
        `TODO: copyright / fair use`
      ])
    ]);

    this.state.root.onmousemove = () => this.showControls();

    this.state.root.appendChild(controlsDiv);

    var active = this.chooseNext();
    this.bringToFront(active);
    this.toggleSound();
    this.showControls();
    this.play();
  }

  chooseNext () {
    var { clips } = this.state;
    return clips[Math.floor(Math.random() * clips.length)];
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

  scheduleNext () {
    if (this.state.scheduled) clearInterval(this.state.scheduled);
    var { options } = this.state;
    var curr = this.getActive();
    var endTime = Math.max(curr.endTime - curr.video.currentTime, 0);
    if (options.random2sec) {
      var orig = endTime;
      endTime = Math.min(2, curr.video.duration - curr.video.currentTime);
      dbg('random2sec: endTime orig %fs new %fs', orig, endTime);
    }
    dbg('schedule will fire: %fs', endTime);
    this.state.scheduled = setTimeout(() => {
      dbg('schedule fired after %fs', endTime);
      this.state.scheduled = null;
      var startTime = curr.startTime;
      if (options.random2sec) {
        curr.video.currentTime = Math.max(curr.startTime
          + (curr.video.duration - curr.startTime) * Math.random(), 2);
        dbg('random2sec: seek %fs', curr.video.currentTime);
      } else {
        curr.video.currentTime = curr.startTime;
      }
      curr.video.pause();
      var next = this.chooseNext();
      next.video.play();
      this.bringToFront(next);
      this.scheduleNext();
    }, endTime * 1000);
  }

  pause () {
    if (this.state.scheduled) clearTimeout(this.state.scheduled);
    this.state.controls.playBtn.innerHTML = '&#9654;';
    return this.getActive().video.pause();
  }

  play () {
    this.state.controls.playBtn.innerHTML = '&#9646;&#9646;';
    this.scheduleNext();
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

