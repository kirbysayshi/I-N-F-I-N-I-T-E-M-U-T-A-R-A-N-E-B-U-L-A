var applyStyle = (el, props) => {
  Object.keys(props).forEach(name => {
    el.style[name] = props[name];
  });
  return el;
}

var o_o = (name, props={}, children=[]) => {
  var el = document.createElement(name);
  Object.keys(props).forEach(name => {
    if (name === 'style') {
      applyStyle(el, props[name]);
    } else {
      el[name] = props[name];
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
      switchTransition: null
    }))
  );

  return Promise.all(clips);
};


class App {

  constructor (clips) {
    this.state = {
      clips,
      scheduled: null,
      controls: {
      },
      root: null,
    }
  }

  mount (root) {
    this.state.root = root;

    applyStyle(this.state.root, {
      position: 'relative',
      height: '100vh',
      overflow: 'hidden',
    });

    var clipsDiv = o_o('div', {
      className: 'clips', // just for debugging
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
    var active = this.chooseNext();
    this.bringToFront(active);
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
    var curr = this.getActive();
    var endTime = Math.max(curr.endTime - curr.video.currentTime, 0);
    console.log('schedule end at', endTime, curr)
    this.state.scheduled = setTimeout(() => {
      this.state.scheduled = null;
      curr.video.currentTime = curr.startTime;
      var next = this.chooseNext();
      next.video.play();
      this.bringToFront(next);
      console.log('switch', next);
      this.scheduleNext();
    }, endTime * 1000);
  }

  pause () {
    if (this.state.scheduled) clearTimeout(this.state.scheduled);
    //this.state.controls.playBtn.textContent = 'PLAY';
    return this.getActive().video.pause();
  }

  play () {
    //this.state.controls.playBtn.textContent = 'PAUSE';
    this.scheduleNext();
    return this.getActive().video.play();
  }

  togglePlay () {
    var { video } = this.getActive();
    if (video.paused) {
      this.play();
    } else {
      this.pause();
    }
  }

}

Boot().then(clips => {
  var app = new App(clips);
  app.mount(document.querySelector('#stage'));
});

