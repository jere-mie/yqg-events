export function RiverArt() {
  return (
    <svg
      viewBox="0 0 640 410"
      role="img"
      aria-label="Illustration of the Windsor riverfront, gardens and Ambassador Bridge"
      className="river-art"
    >
      <defs>
        <pattern id="river-lines" width="76" height="22" patternUnits="userSpaceOnUse">
          <path
            d="M0 11q19-8 38 0t38 0"
            fill="none"
            stroke="#80a9a1"
            strokeWidth="1.2"
            opacity=".65"
          />
        </pattern>
        <pattern id="windows" width="12" height="15" patternUnits="userSpaceOnUse">
          <rect x="4" y="5" width="3" height="6" fill="#edecd3" opacity=".5" />
        </pattern>
      </defs>
      <rect width="640" height="410" fill="#e6edd8" />
      <circle cx="463" cy="91" r="46" fill="#d9e795" />
      <path d="M0 213Q150 173 300 199T640 184V340H0Z" fill="#d8e3d6" />
      <g fill="#9eafa0">
        <path d="M336 198v-78h19v-13h20v91m6 0V98h24v100m7 0v-88h27v88m7 0v-59h27v59m7 0v-40h39v40m7 0v-89h25v89m8 0v-46h24v46m7 0v-64h25v64" />
        <path d="M375 99l12-25 12 25Z" />
      </g>
      <path d="M338 117h247v81H338Z" fill="url(#windows)" />
      <path d="M0 213Q320 197 640 216V343H0Z" fill="#a8c9bd" />
      <path d="M0 213Q320 197 640 216V343H0Z" fill="url(#river-lines)" />
      <g fill="none" stroke="#3c6557">
        <path d="M-20 214l353-47M82 205V71h12v132M256 181V113h10v67" strokeWidth="7" />
        <path d="M-20 184Q31 170 87 80Q166 191 261 118Q311 164 360 164" strokeWidth="3" />
        <path
          d="M23 168v41m25-64v60m67-92v85m26-60v56m26-43v40m26-40v37m27-44v40m72-35v26m23-21v18"
          strokeWidth="1.5"
        />
      </g>
      <path d="M0 321Q120 286 253 309T640 286V410H0Z" fill="#f6f0d9" />
      <path d="M-20 371Q177 289 323 348T659 328" stroke="#d3dac1" strokeWidth="30" fill="none" />
      <path d="M0 388Q155 342 288 396T640 366V410H0Z" fill="#2e5b46" />
      <g fill="#406d4e">
        <path d="M22 342V221h5v123Z" />
        <ellipse cx="22" cy="244" rx="28" ry="47" />
        <ellipse cx="43" cy="274" rx="25" ry="33" />
        <path d="M560 315V190h6v129Z" />
        <ellipse cx="561" cy="216" rx="29" ry="46" />
        <ellipse cx="584" cy="250" rx="27" ry="34" />
      </g>
      <g stroke="#76934c" strokeWidth="3">
        <path d="M85 396v-46m-1 30-19-16m20 1 13-22m383 62v-49m0 30-18-19m18 6 20-21" />
      </g>
      <g fill="#e9b277">
        <circle cx="83" cy="348" r="8" />
        <circle cx="62" cy="362" r="6" />
        <circle cx="99" cy="342" r="7" />
        <circle cx="478" cy="355" r="7" />
        <circle cx="499" cy="350" r="7" />
      </g>
      <g stroke="#304f3f" strokeWidth="4" fill="none">
        <path d="M346 324h49m-43-10h40m-38 9v15m34-15v15" />
      </g>
      <g fill="#254c3e">
        <circle cx="245" cy="299" r="5" />
        <path d="m240 308 8-1 5 16h-18Zm1 15-5 17h4l7-16m0-1 6 15h4l-6-19" />
      </g>
      <g transform="translate(385 251)">
        <path d="m0 0 40 1-7 7H9Z" fill="#faf5de" />
        <path d="M22-23v24M22-20 5-2h17Z" fill="#faf5de" stroke="#52776b" strokeWidth="1" />
      </g>
    </svg>
  );
}
