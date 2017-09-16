
var o_o = (name, props={}, children=[]) => {
  var el = document.createElement(name);
  Object.keys(props).forEach(name => el[name] = props[name]);
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
      playing: false,
      currentClip: null,
      currentTransition: null,
      transitioning: false,
      controls: {
        playBtn: null,
      },
      root: null,
    }
  }

  togglePlay () {
    if (this.state.playing) {
      clearTimeout(this.state.currentTransition);
      this.state.currentClip.video.pause();
      this.state.controls.playBtn.textContent = 'PLAY';
    } else {
      this.playNext();
      this.state.controls.playBtn.textContent = 'PAUSE';
    }

    this.state.playing = !this.state.playing;
  }

  didMount (root) {
    this.state.root = root;
    var playBtn = o_o('button', { onclick: () => this.togglePlay() }, ['PAUSE'])
    this.state.root.appendChild(playBtn);
    this.state.controls.playBtn = playBtn;
    this.playNext();
  }

  playNext () {
    if (this.state.transitioning) return;
    this.state.transitioning = true;
    this.state.playing = true;

    var padTime = 500;
    var curr = this.state.currentClip;
    var next = this.state.clips[Math.floor(Math.random() * this.state.clips.length)];

    clearTimeout(this.state.currentTransition);
    next.video.currentTime = next.startTime;
    next.video.play();

    setTimeout(() => {
      if (curr && curr.video.parentNode) {
        this.state.root.insertBefore(next.video, curr.video);
        this.state.root.removeChild(curr.video);
        setTimeout(() => curr.video.pause(), 100);
      } else {
        this.state.root.appendChild(next.video);
      }

      this.state.currentClip = next;
      this.state.transitioning = false;

      this.state.currentTransition = setTimeout(() => {
        this.playNext();
      }, (next.endTime * 1000) - (padTime * 2));
    }, padTime)
  }
}

Boot().then(clips => {
  var app = new App(clips);
  app.didMount(document.querySelector('#stage'));
});



//var urls = videoSources.map(url => new Promise((resolve, reject) => {
//  downloadData(url, buffer => resolve(window.URL.createObjectURL(new Blob([buffer], { type: "video/mp4" }))));
//}))
//
//urls.forEach(url => {
//  url.then(url => {
//    console.log(url);
//    var v = document.createElement('video');
//    var stage = document.querySelector('#stage');
//    v.src = url;
//    stage.appendChild(v);
//  })
//});
//
//Promise.all(urls).then(() => {
//  return;
//  (function shuffle() {
//
//    var videos = Array.from(document.querySelectorAll('#stage video'));
//    var idx = Math.floor(Math.random() * videos.length);
//    var video = videos[idx];
//
//    videos.forEach((v, i) => {
//      v.style.zIndex = i;
//      v.pause();
//      v.currentTime = 0;
//    });
//
//    video.play();
//    video.style.zIndex = videos.length;
//
//    setTimeout(shuffle, 10000);
//  }())
//})
