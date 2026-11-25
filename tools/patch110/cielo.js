  makeSky() {
    /* v110: cielo del ciclo del giorno (Giorno110 ne muove i colori). Gradiente orizzonte -> zenit,
       bagliore dalla parte del sole basso, alone e disco del sole (HDR: col bloom fa da sole vero),
       stelle di notte. Passa per la stessa curva degli oggetti (niente toneMapped:false): cosi'
       l'orizzonte coincide con la foschia, che ha lo stesso colore (x CIELO110_LUM).
       uSole resta col nome vecchio: la prova grafica (VisualLab93) lo usa. */
    const geo = new THREE.SphereGeometry(430, 32, 16);
    const mat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uSole: { value: new THREE.Vector3(0.45, 0.82, 0.36) }, uZen: { value: new THREE.Color(0x2f7fe6) }, uHor: { value: new THREE.Color(0xb4dcff) }, uGlow: { value: new THREE.Color(0xffffff) }, uSoleCol: { value: new THREE.Color(0xfff6e8) }, uDisco: { value: 9 }, uStelle: { value: 0 }, uLum: { value: CIELO110_LUM } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `varying vec3 vP; uniform vec3 uSole, uZen, uHor, uGlow, uSoleCol; uniform float uDisco, uStelle, uLum;
        float hash110( vec3 p ){ p = fract( p * 0.3183099 + 0.1 ); p *= 17.0; return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) ); }
        void main(){
          vec3 d = normalize( vP ); float h = d.y; vec3 sd = normalize( uSole );
          float t = pow( clamp( h, 0.0, 1.0 ), 0.5 );
          vec3 c = mix( uHor, uZen, smoothstep( 0.0, 0.85, t ) );
          float s = max( dot( d, sd ), 0.0 );
          c = mix( c, uGlow, pow( s, 6.0 ) * ( 1.0 - smoothstep( 0.0, 0.45, h ) ) * 0.75 );
          c *= uLum;
          c += uGlow * pow( s, 90.0 ) * 0.5 + uSoleCol * pow( s, 900.0 ) * 1.5;
          c += uSoleCol * smoothstep( 0.99935, 0.99965, s ) * uDisco;
          if( uStelle > 0.0 ){ float r = hash110( floor( d * 220.0 ) ); c += vec3( step( 0.9978, r ) * ( 0.6 + 0.8 * fract( r * 91.7 ) ) ) * uStelle * smoothstep( 0.02, 0.25, h ); }
          c = mix( c, uHor * uLum, smoothstep( 0.0, -0.08, h ) );
          gl_FragColor = vec4( c, 1.0 );
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }` });
    /* disegnato DOPO gli opachi, col test di profondita': calcola solo i pixel di cielo che si vedono (per primo li calcolava tutti: ~1 ms a 1080p sulla UHD) */
    const sky = new THREE.Mesh(geo, mat); sky.frustumCulled = false; sky.renderOrder = 1000; this.scene.add(sky); this.sky = sky;
    /* v110: nuvole. Prima erano sprite oltre la fine della foschia, quindi uscivano tutte del colore
       della foschia (le macchie arancioni). Ora: fuori dalla foschia, billboard con una texture di
       sbuffi (4 forme in un atlante), luce finta dal gradiente della densita' (lato verso il sole
       chiaro, l'altro in ombra), bordo acceso verso il sole (di piu' in controluce), base piu' scura,
       sfumate verso l'orizzonte. Posizioni e scorrimento come prima (World.update). */
    const tex = nuvolaTex110();
    const nm = this.nuvole110 = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false,
      uniforms: { tNube: { value: tex }, uLuce: { value: new THREE.Color(1, 1, 1) }, uOmbra: { value: new THREE.Color(0.6, 0.7, 0.85) }, uHor: { value: new THREE.Color(0.7, 0.85, 1) }, uSole: { value: new THREE.Vector3(0.45, 0.82, 0.36) }, uLum: { value: CIELO110_LUM } },
      vertexShader: `varying vec2 vUv; varying vec3 vSunV; varying float vH; uniform vec3 uSole;
        void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 ); mv.xy += position.xy * vec2( length( modelMatrix[0].xyz ), length( modelMatrix[1].xyz ) );
          vSunV = normalize( mat3( viewMatrix ) * uSole ); vH = normalize( ( modelMatrix * vec4( 0.0, 0.0, 0.0, 1.0 ) ).xyz - cameraPosition ).y; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec2 vUv; varying vec3 vSunV; varying float vH; uniform sampler2D tNube; uniform vec3 uLuce, uOmbra, uHor; uniform float uLum;
        void main(){ vec4 texel = texture2D( tNube, vUv ); float a = texel.r; if( a < 0.02 ) discard;
          /* luce sulla forma intera (densita' sfocata) + un po' di dettaglio dello sbuffo:
             con la sola densita' fine ogni sbuffo prendeva la sua luce e la nuvola sembrava una fila di palline */
          vec2 g2 = texel.gb * 2.0 - 1.0; vec3 n = normalize( vec3( g2, 0.35 ) );   /* pendenza precalcolata in nuvolaTex110 */ vec3 sv = normalize( vSunV + vec3( 0.0, 0.0, 0.5 ) );
          float lit = smoothstep( 0.15, 0.85, dot( n, sv ) * 0.5 + 0.5 );
          float lv = fract( vUv.y * 2.0 );
          vec3 c = mix( uOmbra, uLuce, lit ) * mix( 0.8, 1.0, smoothstep( 0.12, 0.5, lv ) );
          float bordo = 1.0 - smoothstep( 0.1, 0.5, a );
          float verso = length( g2 ) > 1e-4 ? max( 0.0, dot( normalize( g2 ), normalize( vSunV.xy + vec2( 1e-4 ) ) ) ) : 0.0;
          c += uLuce * bordo * verso * ( 0.3 + 0.9 * clamp( -vSunV.z, 0.0, 1.0 ) );
          c = mix( uHor, c, smoothstep( 0.0, 0.14, vH ) );
          gl_FragColor = vec4( c * uLum, smoothstep( 0.02, 0.32, a ) * 0.96 * smoothstep( -0.02, 0.05, vH ) );
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }` });
    const geos = [0, 1, 2, 3].map((i) => { const g = new THREE.PlaneGeometry(1, 1), uv = g.attributes.uv; const ox = (i % 2) * 0.5, oy = Math.floor(i / 2) * 0.5; for (let j = 0; j < uv.count; j++) uv.setXY(j, ox + uv.getX(j) * 0.5, oy + uv.getY(j) * 0.5); return g; });
    const cl = new THREE.Group();
    /* Le nuvole stanno in alto (160-240) e fuori dall'anello dell'isola: piu' in basso erano una
       macchia di nebbia sopra il paese (sezione 10.3 b di CONTESTO). */
    for (let i = 0; i < 16; i++) {   // 16 e 5 chiamate a wrand ciascuna come prima: il generatore del mondo non si sposta
      const s = new THREE.Mesh(geos[i % 4], nm);
      const a = wrand(0, Math.PI * 2), r = wrand(230, 430);
      s.position.set(Math.cos(a) * r, wrand(160, 240), Math.sin(a) * r);
      const sc = wrand(80, 150); s.scale.set(sc, sc * 0.5, 1); s.renderOrder = -5;
      s.userData.v = wrand(0.4, 1.1); cl.add(s);
    }
    this.scene.add(cl); this.clouds = cl;
    // v100: tolto lo sprite del sole (disco arancione nel cielo). v110: il disco ora lo disegna il cielo.
    this.sunSprite93=null;
  }
