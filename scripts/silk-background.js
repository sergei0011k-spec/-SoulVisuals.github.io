/* Animated graphite silk folds behind the protected application shell. */
(function () {
    var canvas = document.getElementById('auth-silk-canvas') || document.getElementById('bg-canvas');
    if (!canvas) return;
    var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return;

    var vertex = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    var palette = canvas.id === 'auth-silk-canvas' || canvas.id === 'purchase-silk-canvas'
        ? 'vec3 dark=vec3(.025,.027,.032),slate=vec3(.09,.10,.12),steel=vec3(.30,.33,.36),light=vec3(.84,.86,.88);'
        : 'vec3 dark=vec3(.025,.027,.032),slate=vec3(.075,.088,.105),steel=vec3(.23,.26,.30),light=vec3(.72,.75,.78);';
    var fragment = 'precision highp float;uniform vec2 u_res;uniform float u_time;'
        + 'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}'
        + 'float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),u.x),u.y);}'
        + 'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p*=2.;a*=.5;}return v;}'
        + 'void main(){vec2 uv=(gl_FragCoord.xy-.5*u_res)/u_res.y;float t=u_time*.045;'
        + 'vec2 q=vec2(fbm(uv*1.25+vec2(0.,t)),fbm(uv*1.25+vec2(5.2,-t)));'
        + 'vec2 r=vec2(fbm(uv*1.45+3.8*q+vec2(1.7,9.2)+t),fbm(uv*1.45+3.8*q+vec2(8.3,2.8)-t));'
        + 'float f=fbm(uv*1.25+4.5*r);float waves=pow(1.-abs(sin((f+r.x*.55+r.y*.25)*15.)),2.8);'
        + 'float b1=smoothstep(.95,.05,length((uv-vec2(-.72,.13))*vec2(.72,1.35)));'
        + 'float b2=smoothstep(.55,.02,length((uv-vec2(.42,.50))*vec2(1.15,2.55)));'
        + 'float b3=smoothstep(.70,.03,length((uv-vec2(-.05,-.66))*vec2(1.45,.72)));'
        + 'float glow=clamp((b1+b2*.85+b3*.45)*(.35+waves*.58),0.,1.);'
        + palette
        + 'vec3 col=mix(dark,slate,smoothstep(.18,.80,f));col=mix(col,steel,smoothstep(.35,.90,f+waves*.22)*.38);col=mix(col,light,glow*.62);'
        + 'float vig=smoothstep(1.42,.20,length(uv)),rightShade=smoothstep(-.15,.95,uv.x);col*=mix(.38,1.,vig)*mix(1.,.68,rightShade);gl_FragColor=vec4(col,1.);}';

    function shader(type, source) { var value = gl.createShader(type); gl.shaderSource(value, source); gl.compileShader(value); return gl.getShaderParameter(value, gl.COMPILE_STATUS) ? value : null; }
    var vs = shader(gl.VERTEX_SHADER, vertex), fs = shader(gl.FRAGMENT_SHADER, fragment);
    if (!vs || !fs) return;
    var program = gl.createProgram(); gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);
    var buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
    var location = gl.getAttribLocation(program, 'p'); gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    var resolution = gl.getUniformLocation(program, 'u_res'), time = gl.getUniformLocation(program, 'u_time');
    function resize() { var ratio = Math.min(window.devicePixelRatio || 1, .85), width = Math.max(1, Math.floor((canvas.clientWidth || innerWidth) * ratio)), height = Math.max(1, Math.floor((canvas.clientHeight || innerHeight) * ratio)); if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; } gl.viewport(0, 0, width, height); }
    addEventListener('resize', resize, { passive: true }); resize();
    var reduced = matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches, start = null, last = 0;
    function frame(now) { if (start === null) start = now; if (reduced || now-last >= 1000/30) { last = now; gl.uniform2f(resolution, canvas.width, canvas.height); gl.uniform1f(time, reduced ? 8 : (now-start)/1000); gl.drawArrays(gl.TRIANGLES, 0, 3); } if (!reduced) requestAnimationFrame(frame); }
    requestAnimationFrame(frame);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) resize(); });
})();
