import babel from 'rollup-plugin-babel';
import nodeResolve from 'rollup-plugin-node-resolve';

const pkg = require('./package.json');

export default {
  input: 'src/index.jsx',
  external: ['events', 'fs', 'path', ...Object.keys(pkg['dependencies'])],
  plugins: [
    nodeResolve({
      // Allow `import`ing of JSX files without specifying the .jsx extension in import paths.
      extensions: ['.js', '.jsx'],
    }),
    babel({
      presets: [
        ['env', {
          targets: {
            node: 'current'
          },
          modules: false
        }]
      ],
      plugins: [
        'transform-react-jsx',
        'transform-function-bind',
        // Don't need to transform object rest spread since Node 8.9.3 supports it, but for some
        // reason we do need to teach Babel to parse it. https://github.com/babel/babel/issues/6970
        // isn't quite the error seen, but similar.
        'syntax-object-rest-spread'
      ],
      exclude: [ 'node_modules/**' ]
    })
  ],
  output: [{
    format: 'cjs',
    file: pkg['main']
  }]
};
