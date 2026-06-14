// Baseline arm: no skill injection — raw task, default model behavior.
module.exports = async (context) => {
  return [
    { role: 'user', content: context.vars.task }
  ];
};
