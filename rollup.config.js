import babel from 'rollup-plugin-babel';
import nodeResolve from 'rollup-plugin-node-resolve';

const pkg = require('./package.json');

export default {
  input: 'src/index.jsx',
  external: Object.keys(pkg['dependencies']),
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
        ['transform-react-jsx', { pragma: 'h' }],
      ],
      exclude: [ 'node_modules/**' ]
    })
  ],
  output: [{
    format: 'cjs',
    file: pkg['main']
  }]
};
