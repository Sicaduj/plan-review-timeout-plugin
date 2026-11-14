/** Generate this standalone package's Typert artifacts through the checkout's standard analyzer. */
import { copyFileSync, cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { FaceModelEmitter, WorkspaceAnalyzer, writePackageArtifacts } from '../../deepseek-harness/packages/typert/generator/lib/index.js'

const packageDir = join(import.meta.dirname, '..')
const checkoutDir = join(packageDir, '..', 'deepseek-harness')
const workspaceDir = join(packageDir, '.typert-workspace')
const nestedPackageDir = join(workspaceDir, 'packages', 'plan-review-timeout-plugin')
const protocolDir = join(workspaceDir, 'packages', 'typert', 'protocol')
const packageName = '@deepseek-ai/dsh-experimental-plan-review-timeout'
const baseConfigPath = join(checkoutDir, 'tsconfig.base.json')
const baseConfig = ts.readConfigFile(baseConfigPath, path => readFileSync(path, 'utf8'))
if (baseConfig.error !== undefined) throw new Error(`Cannot read ${baseConfigPath}`)
const paths = Object.fromEntries(Object.entries(baseConfig.config.compilerOptions.paths).map(([key, values]) => [
  key,
  values.map(value => join(checkoutDir, value)),
]))
for (const [subpath, source] of Object.entries({ '': 'index.ts', '/types': 'types.ts', '/remote-info': 'remote-info.ts' })) {
  paths[`@deepseek-ai/dsh-typert-protocol${subpath}`] = [join(protocolDir, 'src', source)]
}

rmSync(workspaceDir, { recursive: true, force: true })
try {
  mkdirSync(nestedPackageDir, { recursive: true })
  mkdirSync(protocolDir, { recursive: true })
  copyFileSync(join(packageDir, 'package.json'), join(nestedPackageDir, 'package.json'))
  cpSync(join(packageDir, 'src'), join(nestedPackageDir, 'src'), { recursive: true })
  cpSync(join(checkoutDir, 'packages', 'typert', 'protocol', 'src'), join(protocolDir, 'src'), { recursive: true })
  copyFileSync(join(checkoutDir, 'packages', 'typert', 'protocol', 'package.json'), join(protocolDir, 'package.json'))
  writeFileSync(join(workspaceDir, 'tsconfig.host.json'), JSON.stringify({
    extends: baseConfigPath,
    compilerOptions: { paths },
    files: [],
    references: [
      { path: './packages/plan-review-timeout-plugin/tsconfig.json' },
      { path: './packages/typert/protocol/tsconfig.json' },
    ],
  }, null, 2) + '\n')
  writeFileSync(join(nestedPackageDir, 'tsconfig.json'), JSON.stringify({
    extends: baseConfigPath,
    compilerOptions: { rootDir: 'src', outDir: 'lib/types', noEmit: true },
    files: ['src/index.ts', 'src/timeout.ts', 'src/types.ts'],
  }, null, 2) + '\n')
  writeFileSync(join(protocolDir, 'tsconfig.json'), JSON.stringify({
    extends: baseConfigPath,
    compilerOptions: { rootDir: 'src', noEmit: true },
    include: ['src'],
  }, null, 2) + '\n')
  const workspace = new WorkspaceAnalyzer({
    root: workspaceDir,
    packages: [packageName],
    faces: ['host'],
    checkDiagnostics: false,
    rejectBuildOutputs: true,
  }).analyze()
  const artifacts = workspace.faces.flatMap(face => face.packages
    .filter(candidate => candidate.name === packageName)
    .map(candidate => ({ ...new FaceModelEmitter(face).emit(candidate.name), packageRoot: candidate.root })))
  if (artifacts.length === 0) throw new Error(`Typert discovered no Host contribution for ${packageName}`)
  if (artifacts.some(artifact => artifact.remote === undefined)) throw new Error(`Typert generated no Remote contribution for ${packageName}`)
  writePackageArtifacts(packageDir, artifacts)
  console.log(`Generated ${artifacts.length} Typert artifact(s) for ${packageName}`)
} finally {
  rmSync(workspaceDir, { recursive: true, force: true })
}
