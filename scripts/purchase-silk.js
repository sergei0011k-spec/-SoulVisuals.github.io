/* Local animated silk background for the left side of the purchase dialog. */
(function () {
    var canvas = document.getElementById('purchase-silk-canvas');
    if (!canvas) return;
    var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return;

    var vertex = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    var fragment = 'precision highp float;uniform vec2 r;uniform float t;'
        + 'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float n(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),u.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),u.x),u.y);}float f(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p*=2.;a*=.5;}return v;}'
        + 'void main(){vec2 u=(gl_FragCoord.xy-.5*r)/r.y;float q=t*.055;vec2 d=vec2(f(u*1.25+vec2(0.,q)),f(u*1.25+vec2(5.2,-q)));float z=f(u*1.4+4.*d);float w=pow(1.-abs(sin(z*15.)),2.8);float b=smoothstep(.9,.04,length((u-vec2(-.42,.08))*vec2(.85,1.3)));vec3 a=vec3(.025,.027,.032),c=vec3(.10,.12,.14),s=vec3(.42,.45,.48),l=vec3(.9);vec3 x=mix(a,c,smoothstep(.18,.8,z));x=mix(x,s,w*.48);x=mix(x,l,b*(.25+w*.55));x*=smoothstep(1.42,.2,length(u));gl_FragColor=vec4(x,1.);}';
    function shader(type, source) { var value = gl.createShader(type); gl.shaderSource(value, source); gl.compileShader(value); return gl.getShaderParameter(value, gl.COMPILE_STATUS) ? value : null; }
    var vs = shader(gl.VERTEX_SHADER, vertex), fs = shader(gl.FRAGMENT_SHADER, fragment);
    if (!vs || !fs) return;
    var program = gl.createProgram(); gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);
    var buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
    var location = gl.getAttribLocation(program, 'p'); gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
    var resolution = gl.getUniformLocation(program, 'r'), time = gl.getUniformLocation(program, 't');
    function resize() { var ratio = Math.min(window.devicePixelRatio || 1, .85), width = Math.floor(canvas.clientWidth * ratio), height = Math.floor(canvas.clientHeight * ratio); if (!width || !height) return; canvas.width = width; canvas.height = height; gl.viewport(0, 0, width, height); }
    addEventListener('resize', resize, { passive: true }); resize();
    var start = null, last = 0, reduced = matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    function frame(now) { if (start === null) start = now; if (reduced || now - last >= 1000 / 30) { last = now; if (canvas.offsetParent && canvas.width && canvas.height) { gl.uniform2f(resolution, canvas.width, canvas.height); gl.uniform1f(time, reduced ? 8 : (now - start) / 1000); gl.drawArrays(gl.TRIANGLES, 0, 3); } } if (!reduced) requestAnimationFrame(frame); }
    requestAnimationFrame(frame);
})();
