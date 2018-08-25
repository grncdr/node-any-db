const cp = require('child_process')
const packagePaths = require('./tsconfig.json').references.map(ref => ref.path)

function testPackage(packagePath) {
  return new Promise(resolve => {
    cp.exec('npm test', { cwd: packagePath }, (error, stdout, stderr) => {
      resolve({ packagePath, error, stdout, stderr })
    })
  })
}

function indent(text) {
  return text
    .split('\n')
    .map(line => (/^(not )?ok/.test(line) ? line : `  ${line}`))
    .join('\n')
}

Promise.all(packagePaths.map(testPackage)).then(results => {
  let failed = false
  results.forEach(result => {
    console.log(`# ${result.packagePath}\n`)
    if (result.error) {
      failed = true
      console.error(indent(result.stderr))
    } else {
      console.log(indent(result.stdout))
    }
  })
  process.exit(failed ? 1 : 0)
})
