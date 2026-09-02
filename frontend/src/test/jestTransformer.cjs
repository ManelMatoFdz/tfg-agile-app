const babelJest = require('babel-jest');

function transformViteEnv({ types }) {
  return {
    visitor: {
      MemberExpression(path) {
        const object = path.node.object;
        if (
          types.isMetaProperty(object) &&
          object.meta.name === 'import' &&
          object.property.name === 'meta' &&
          types.isIdentifier(path.node.property, { name: 'env' })
        ) {
          path.replaceWith(types.memberExpression(types.identifier('process'), types.identifier('env')));
        }
      },
    },
  };
}

module.exports = babelJest.createTransformer({
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript',
  ],
  plugins: [transformViteEnv],
});
