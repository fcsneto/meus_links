const { build } = require('../src/generator');

try {
  const result = build();
  console.log(`Site gerado: ${result.files.length} arquivos.`);
} catch (error) {
  console.error(`Falha ao gerar o site: ${error.message}`);
  process.exitCode = 1;
}
