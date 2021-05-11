import * as core from '@actions/core'
import csvparse from 'csv-parse/lib/sync'
import * as cp from 'child_process'

async function run(): Promise<void> {
  try {
    const sourceImage: string = core.getInput('source', {required: true})
    const targetImages: string[] = await getInputList({
      name: 'target',
      required: true
    })

    for (const tag of targetImages) {
      retag(sourceImage, tag)
      push(tag)
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

const push = (image: string): void => {
  cp.execSync(`docker push ${image} 2>&1`)
}

const retag = (src: string, dst: string): void => {
  core.info(`Retag Image`)
  cp.execSync(`docker tag ${src} ${dst} 2>&1`)
}

export interface GetInputListProps {
  name: string
  ignoreComma?: boolean
  required?: boolean
}

export async function getInputList({
  name,
  ignoreComma,
  required
}: GetInputListProps): Promise<string[]> {
  const res: string[] = []

  const items = core.getInput(name, {required})

  for (const output of (await csvparse(items, {
    columns: false,
    relaxColumnCount: true,
    skipLinesWithEmptyValues: true
  })) as string[][]) {
    if (output.length === 1) {
      res.push(output[0])
      continue
    } else if (!ignoreComma) {
      res.push(...output)
      continue
    }
    res.push(output.join(','))
  }

  return res.filter(item => item).map(pat => pat.trim())
}

run()
