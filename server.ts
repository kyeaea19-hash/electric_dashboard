import dotenv from 'dotenv';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KPX_ENDPOINT =
  'https://apis.data.go.kr/B552115/SmpWithForecastDemand/getSmpWithForecastDemand';

function readServiceKey(): string {
  // Re-read .env on demand so user edits to .env apply without requiring manual restart
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    try {
      const parsed = dotenv.parse(fs.readFileSync(envPath, 'utf8'));
      const fileKey = (
        parsed.DATA_GO_KR_SERVICE_KEY ||
        parsed.KPX_API_KEY ||
        ''
      ).trim();
      if (fileKey && fileKey !== 'MY_API_KEY') {
        return fileKey;
      }
    } catch {
      // Fallback to process.env below
    }
  }

  return (
    process.env.DATA_GO_KR_SERVICE_KEY ||
    process.env.KPX_API_KEY ||
    ''
  ).trim();
}

function extractXmlTag(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i'));
  return match ? match[1].trim() : null;
}

function getKstTodayYmd(): string {
  const now = new Date();
  const kstMs = now.getTime() + 9 * 60 * 60 * 1000;
  const kst = new Date(kstMs);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(kst.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

interface RawSmpForecastItem {
  date?: string;
  hour?: string | number;
  areaName?: string;
  smp?: string | number;
  mlfd?: string | number;
  jlfd?: string | number;
  slfd?: string | number;
  rn?: string | number;
}

async function createServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.get('/api/power-supply', async (req, res) => {
    const serviceKey = readServiceKey();
    if (!serviceKey) {
      res.status(400).json({
        ok: false,
        code: 'MISSING_API_KEY',
        error: '.env 파일에 DATA_GO_KR_SERVICE_KEY 인증키가 설정되어 있지 않습니다.',
        detail:
          '프로젝트 루트의 .env 파일에 공공데이터포털 인증키를 입력한 뒤 다시 시도해 주세요.',
        endpoint: KPX_ENDPOINT,
      });
      return;
    }

    const rawDateParam =
      typeof req.query.date === 'string' ? req.query.date.trim() : '';
    const dateParam = /^\d{4}-\d{2}-\d{2}$/.test(rawDateParam)
      ? rawDateParam.replace(/-/g, '')
      : /^\d{8}$/.test(rawDateParam)
        ? rawDateParam
        : getKstTodayYmd();

    const encodedKey = serviceKey.includes('%')
      ? serviceKey
      : encodeURIComponent(serviceKey);

    const requestUrl =
      `${KPX_ENDPOINT}?serviceKey=${encodedKey}` +
      `&pageNo=1&numOfRows=48&dataType=json&date=${encodeURIComponent(dateParam)}`;

    try {
      const upstream = await fetch(requestUrl, {
        headers: {
          Accept: 'application/json, text/xml;q=0.9, */*;q=0.8',
        },
        signal: AbortSignal.timeout(10000),
      });

      const rawText = await upstream.text();

      if (!upstream.ok) {
        res.status(upstream.status).json({
          ok: false,
          code: `HTTP_${upstream.status}`,
          error: `공공데이터 API 요청 실패 (HTTP ${upstream.status})`,
          detail: rawText.slice(0, 300) || upstream.statusText,
          endpoint: KPX_ENDPOINT,
        });
        return;
      }

      // Check XML error payload from data.go.kr gateway
      if (rawText.trim().startsWith('<')) {
        const errMsg = extractXmlTag(rawText, 'errMsg');
        const returnAuthMsg = extractXmlTag(rawText, 'returnAuthMsg');
        const returnReasonCode = extractXmlTag(rawText, 'returnReasonCode');
        const resultMsg = extractXmlTag(rawText, 'resultMsg');

        res.status(502).json({
          ok: false,
          code: returnReasonCode || 'UPSTREAM_XML_ERROR',
          error:
            returnAuthMsg ||
            errMsg ||
            resultMsg ||
            '공공데이터포털 게이트웨이 오류가 반환되었습니다.',
          detail: [errMsg, returnAuthMsg, returnReasonCode, resultMsg]
            .filter(Boolean)
            .join(' · '),
          endpoint: KPX_ENDPOINT,
        });
        return;
      }

      let json: {
        response?: {
          header?: { resultCode?: string; resultMsg?: string };
          body?: {
            items?: { item?: RawSmpForecastItem[] | RawSmpForecastItem } | RawSmpForecastItem[];
            totalCount?: number;
          };
        };
      };

      try {
        json = JSON.parse(rawText);
      } catch {
        res.status(502).json({
          ok: false,
          code: 'INVALID_JSON',
          error: 'API 응답을 JSON으로 해석하지 못했습니다.',
          detail: rawText.slice(0, 240),
          endpoint: KPX_ENDPOINT,
        });
        return;
      }

      const header = json.response?.header;
      if (header?.resultCode && header.resultCode !== '00') {
        res.status(502).json({
          ok: false,
          code: header.resultCode,
          error: header.resultMsg || '공공데이터 API 응답 오류가 발생했습니다.',
          detail: `resultCode=${header.resultCode} (${header.resultMsg || ''})`,
          endpoint: KPX_ENDPOINT,
        });
        return;
      }

      const bodyItems = json.response?.body?.items;
      const rawItems = Array.isArray(bodyItems)
        ? bodyItems
        : bodyItems?.item
          ? Array.isArray(bodyItems.item)
            ? bodyItems.item
            : [bodyItems.item]
          : [];

      if (rawItems.length === 0) {
        res.status(404).json({
          ok: false,
          code: 'NO_DATA',
          error: `요청한 날짜(${dateParam})의 실시간 전력 수급 데이터가 없습니다.`,
          detail: '다른 날짜를 선택하거나 잠시 후 다시 시도해 주세요.',
          endpoint: KPX_ENDPOINT,
        });
        return;
      }

      const items = rawItems.map((item) => ({
        date: String(item.date || dateParam),
        hour: Number(item.hour ?? 0),
        areaName: String(item.areaName || '육지'),
        smp: Number(item.smp ?? 0),
        mlfd: Number(item.mlfd ?? 0),
        jlfd: Number(item.jlfd ?? 0),
        slfd: Number(item.slfd ?? 0),
      }));

      res.json({
        ok: true,
        endpoint: KPX_ENDPOINT,
        requestedDate: dateParam,
        fetchedAt: new Date().toISOString(),
        items,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '알 수 없는 네트워크 오류';
      res.status(502).json({
        ok: false,
        code: 'NETWORK_ERROR',
        error: '공공데이터포털 API 서버에 연결하지 못했습니다.',
        detail: message,
        endpoint: KPX_ENDPOINT,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
  });
}

void createServer();
