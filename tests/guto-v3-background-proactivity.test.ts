import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const chatTabSource = readFileSync(
  new URL("../components/guto/tabs/chat-tab.tsx", import.meta.url),
  "utf8",
)
const gutoApiSource = readFileSync(
  new URL("../lib/api/guto.ts", import.meta.url),
  "utf8",
)

test("V3 background proactivity keeps unsupported errors observable without unhandled rejections", () => {
  assert.match(
    chatTabSource,
    /const refreshProactiveMemories = useCallback\(async \(\) => \{[\s\S]*?try \{[\s\S]*?await getProactiveMemories\(\)[\s\S]*?catch \(error\) \{[\s\S]*?getApiErrorMessage\(error\)[\s\S]*?return null/,
  )
  assert.match(
    chatTabSource,
    /void extractProactivityEvents\([\s\S]*?\)\.then\([\s\S]*?\)\.catch\(\(error\) => \{[\s\S]*?getApiErrorMessage\(error\)/,
  )

  assert.match(
    gutoApiSource,
    /export async function extractProactivityEvents[\s\S]*?if \(isGutoV3Enabled\(\)\) throwV3UnsupportedFeature\("extração proativa"\)/,
  )
  assert.match(
    gutoApiSource,
    /export async function getProactiveMemories[\s\S]*?if \(isGutoV3Enabled\(\)\) throwV3UnsupportedFeature\("memórias proativas"\)/,
  )
})
