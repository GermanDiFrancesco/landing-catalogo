/**
 * server.js - Servidor HTTP + API de Contacto y Configuración para Tecnografic S.A.
 *
 * Funcionalidades:
 * - POST /api/contact  : Valida, protege contra spam (honeypot + rate limit) y envía mail vía SMTP (Nodemailer)
 * - GET  /api/config   : Expone configuración pública para el frontend (ej. GOOGLE_MAPS_API_KEY desde .env)
 * - GET  /api/health   : Verificación de estado del servicio y configuración
 * - Archivos estáticos + fallback SPA a index.html (con bloqueo de archivos sensibles/.env)
 *
 * Utilidades CLI:
 * - node server.js --verify-smtp  : Prueba conexión y autenticación SMTP sin enviar correo
 * - node server.js --send-test    : Envía un correo de prueba a MAIL_TO para validar entrega real
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno desde .env junto a server.js
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
const nodemailer = require('nodemailer');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const ROOT_DIR = __dirname;
const INDEX_FILE = path.join(ROOT_DIR, 'index.html');
const MAX_BODY_BYTES = 16 * 1024; // 16 KB

// Rate limit simple en memoria: máximo 5 consultas cada 15 minutos por IP
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const rateLimitStore = new Map();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};

const SITE_BASE_URL = (process.env.SITE_URL || 'https://www.tecnograficsa.com.ar').replace(/\/+$/, '');
const DEFAULT_OG_IMAGE = `${SITE_BASE_URL}/assets/img/marcas-logos/Tecnografic%20logo.webp`;

const STATIC_ROUTE_SEO = {
  '/': {
    title: 'Tecnografic | Cuadernos, Repuestos y Artículos Escolares',
    description: 'Tecnografic: Fabricante líder de cuadernos, repuestos y artículos escolares con marcas como Triunfante, Tintoretto, Potosí y Mis Hojas.',
    canonicalPath: '/',
    ogType: 'website',
    robots: 'index, follow'
  },
  '/nosotros': {
    title: 'Nosotros | Tecnografic',
    description: 'Conocé la historia, filosofía y trayectoria de Tecnografic S.A., fabricante de cuadernos, repuestos y artículos escolares de calidad.',
    canonicalPath: '/nosotros',
    ogType: 'website',
    robots: 'index, follow'
  },
  '/catalogos': {
    title: 'Catálogos Descargables | Tecnografic',
    description: 'Descargá los catálogos en PDF y accedé al banco de imágenes de Triunfante, Tintoretto, Potosí y Mis Hojas.',
    canonicalPath: '/catalogos',
    ogType: 'website',
    robots: 'index, follow'
  },
  '/puntos-de-venta': {
    title: 'Puntos de Venta | Tecnografic',
    description: 'Encontrá mayoristas y minoristas donde adquirir los productos de Tecnografic en todo el país.',
    canonicalPath: '/puntos-de-venta',
    ogType: 'website',
    robots: 'index, follow'
  },
  '/contacto': {
    title: 'Contacto | Tecnografic',
    description: 'Contactate con Tecnografic S.A. para consultas comerciales, mayoristas o información sobre nuestros productos.',
    canonicalPath: '/contacto',
    ogType: 'website',
    robots: 'index, follow'
  }
};

let seoBrandsCache = null;
const seoProductsCache = new Map();

function loadSeoBrands() {
  if (seoBrandsCache) return seoBrandsCache;
  try {
    const raw = fs.readFileSync(path.join(ROOT_DIR, 'assets', 'data', 'brands.json'), 'utf8');
    seoBrandsCache = JSON.parse(raw);
  } catch {
    seoBrandsCache = {};
  }
  return seoBrandsCache;
}

function loadSeoBrandProducts(brandKey) {
  if (seoProductsCache.has(brandKey)) return seoProductsCache.get(brandKey);
  try {
    const raw = fs.readFileSync(path.join(ROOT_DIR, 'assets', 'data', 'products', `${brandKey}.json`), 'utf8');
    const parsed = JSON.parse(raw);
    seoProductsCache.set(brandKey, parsed);
    return parsed;
  } catch {
    return null;
  }
}

function toAbsoluteUrl(assetPath) {
  if (!assetPath) return DEFAULT_OG_IMAGE;
  if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) return assetPath;
  const normalized = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
  return `${SITE_BASE_URL}${encodeURI(normalized)}`;
}

function resolveRouteSeo(rawUrl) {
  const parsedUrl = new URL(rawUrl || '/', SITE_BASE_URL);
  let pathname = parsedUrl.pathname || '/';
  if (pathname === '/index.html' || pathname === '') pathname = '/';
  else if (pathname.length > 1 && pathname.endsWith('/')) pathname = pathname.slice(0, -1);

  if (STATIC_ROUTE_SEO[pathname]) {
    return { ...STATIC_ROUTE_SEO[pathname], ogImage: DEFAULT_OG_IMAGE };
  }

  if (pathname === '/marca' || pathname.startsWith('/marca/')) {
    const match = pathname.match(/^\/marca\/([^/]+)/);
    const rawBrandKey = (match && match[1]) || parsedUrl.searchParams.get('b') || 'triunfante';
    const brands = loadSeoBrands();
    const brand = brands[rawBrandKey];

    if (brand) {
      const prodId = parsedUrl.searchParams.get('prod');
      if (prodId) {
        const brandProducts = loadSeoBrandProducts(brand.id);
        const categories = Array.isArray(brandProducts?.categories) ? brandProducts.categories : [];
        for (const cat of categories) {
          const product = (cat.products || []).find(p => p && p.id === prodId);
          if (product) {
            const firstVariantImg = product.variants && product.variants[0] && (product.variants[0].image || product.variants[0].imageClean);
            return {
              title: `${product.name} — ${brand.name} | Tecnografic`,
              description: product.description || brand.description || STATIC_ROUTE_SEO['/'].description,
              canonicalPath: `/marca/${encodeURIComponent(brand.id)}?prod=${encodeURIComponent(product.id)}`,
              ogType: 'product',
              ogImage: toAbsoluteUrl(product.familyImage || firstVariantImg || brand.logoAzul || brand.logo),
              robots: 'index, follow'
            };
          }
        }
      }

      return {
        title: `${brand.name} | Tecnografic`,
        description: brand.description || STATIC_ROUTE_SEO['/'].description,
        canonicalPath: `/marca/${encodeURIComponent(brand.id)}`,
        ogType: 'website',
        ogImage: toAbsoluteUrl(brand.logoAzul || brand.logo),
        robots: 'index, follow'
      };
    }
  }

  return {
    ...STATIC_ROUTE_SEO['/'],
    ogImage: DEFAULT_OG_IMAGE,
    robots: 'noindex, follow'
  };
}

function sendSeoIndexHtml(res, rawUrl) {
  fs.readFile(INDEX_FILE, 'utf8', (err, html) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('500 Internal Server Error');
      return;
    }

    const seo = resolveRouteSeo(rawUrl);
    const canonicalUrl = `${SITE_BASE_URL}${seo.canonicalPath}`;
    const safeTitle = escapeHtml(seo.title);
    const safeDesc = escapeHtml(seo.description);
    const safeCanonical = escapeHtml(canonicalUrl);
    const safeImage = escapeHtml(seo.ogImage || DEFAULT_OG_IMAGE);
    const safeRobots = escapeHtml(seo.robots || 'index, follow');
    const safeOgType = escapeHtml(seo.ogType || 'website');

    const rendered = html
      .replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`)
      .replace(/<meta\s+name="description"[\s\S]*?>/i, `<meta name="description" content="${safeDesc}">`)
      .replace(/<meta\s+name="robots"[^>]*>/i, `<meta name="robots" content="${safeRobots}">`)
      .replace(/<link\s+rel="canonical"[^>]*>/i, `<link rel="canonical" href="${safeCanonical}">`)
      .replace(/<meta\s+property="og:type"[^>]*>/i, `<meta property="og:type" content="${safeOgType}">`)
      .replace(/<meta\s+property="og:title"[^>]*>/i, `<meta property="og:title" content="${safeTitle}">`)
      .replace(/<meta\s+property="og:description"[\s\S]*?>/i, `<meta property="og:description" content="${safeDesc}">`)
      .replace(/<meta\s+property="og:url"[^>]*>/i, `<meta property="og:url" content="${safeCanonical}">`)
      .replace(/<meta\s+property="og:image"[^>]*>/i, `<meta property="og:image" content="${safeImage}">`)
      .replace(/<meta\s+name="twitter:title"[^>]*>/i, `<meta name="twitter:title" content="${safeTitle}">`)
      .replace(/<meta\s+name="twitter:description"[\s\S]*?>/i, `<meta name="twitter:description" content="${safeDesc}">`)
      .replace(/<meta\s+name="twitter:image"[^>]*>/i, `<meta name="twitter:image" content="${safeImage}">`);

    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    });
    res.end(rendered);
  });
}

// Archivos y directorios raíz que nunca deben servirse públicamente
const BLOCKED_TOP_LEVEL = new Set([
  'node_modules',
  'data',
  'server.js',
  'dev-server.js',
  'package.json',
  'package-lock.json',
  'ecosystem.config.cjs',
  'tailwind.config.js',
  'postcss.config.js'
]);

function isMailEnabled() {
  return (process.env.MAIL_ENABLED || '').trim().toLowerCase() === 'true';
}

function getContactStoragePath() {
  const custom = (process.env.CONTACT_STORAGE_FILE || '').trim();
  if (custom) {
    return path.isAbsolute(custom) ? custom : path.resolve(ROOT_DIR, custom);
  }
  return path.join(ROOT_DIR, 'data', 'contact-messages.json');
}

// Cola secuencial de escritura para evitar condiciones de carrera sobre el JSON
let storageWriteQueue = Promise.resolve();

function appendContactToJson(record) {
  const filePath = getContactStoragePath();
  storageWriteQueue = storageWriteQueue
    .catch(() => {})
    .then(async () => {
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      let list = [];
      try {
        const raw = await fs.promises.readFile(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          list = parsed;
        }
      } catch (err) {
        if (err.code !== 'ENOENT') {
          console.warn('[contact] No se pudo leer el JSON existente, se reinicializa:', err.message);
        }
      }
      list.push(record);
      await fs.promises.writeFile(filePath, JSON.stringify(list, null, 2) + '\n', 'utf8');
    });
  return storageWriteQueue;
}

function updateContactInJson(recordId, patch) {
  const filePath = getContactStoragePath();
  storageWriteQueue = storageWriteQueue
    .catch(() => {})
    .then(async () => {
      try {
        const raw = await fs.promises.readFile(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return;
        const item = parsed.find(x => x && x.id === recordId);
        if (item) {
          Object.assign(item, patch);
          await fs.promises.writeFile(filePath, JSON.stringify(parsed, null, 2) + '\n', 'utf8');
        }
      } catch (err) {
        console.warn('[contact] No se pudo actualizar estado en JSON local:', err.message);
      }
    });
  return storageWriteQueue;
}

function isSmtpConfigured() {
  return Boolean(
    (process.env.SMTP_HOST || '').trim() &&
    (process.env.SMTP_USER || '').trim() &&
    (process.env.SMTP_PASS || '').trim()
  );
}

function createMailTransporter() {
  const host = (process.env.SMTP_HOST || '').trim();
  const port = Number(process.env.SMTP_PORT) || 587;
  const secureEnv = (process.env.SMTP_SECURE || '').trim().toLowerCase();
  const secure = secureEnv ? secureEnv === 'true' : port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: (process.env.SMTP_USER || '').trim(),
      pass: process.env.SMTP_PASS
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  });
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeHeaderValue(value) {
  return String(value || '').replace(/[\r\n]+/g, ' ').trim();
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function checkRateLimit(ip) {
  const now = Date.now();
  const timestamps = (rateLimitStore.get(ip) || []).filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);

  if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    rateLimitStore.set(ip, timestamps);
    return false;
  }

  timestamps.push(now);
  rateLimitStore.set(ip, timestamps);

  // Limpieza oportunista para evitar crecimiento indefinido
  if (rateLimitStore.size > 500) {
    for (const [key, list] of rateLimitStore.entries()) {
      const valid = list.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
      if (valid.length === 0) {
        rateLimitStore.delete(key);
      } else {
        rateLimitStore.set(key, valid);
      }
    }
  }

  return true;
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders
  });
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    let byteLength = 0;

    req.on('data', (chunk) => {
      byteLength += chunk.length;
      if (byteLength > MAX_BODY_BYTES) {
        const err = new Error('PAYLOAD_TOO_LARGE');
        err.statusCode = 413;
        reject(err);
        req.destroy();
        return;
      }
      raw += chunk.toString('utf8');
    });

    req.on('end', () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        const err = new Error('INVALID_JSON');
        err.statusCode = 400;
        reject(err);
      }
    });

    req.on('error', reject);
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

async function handleContactPost(req, res) {
  const clientIp = getClientIp(req);
  if (!checkRateLimit(clientIp)) {
    sendJson(res, 429, {
      ok: false,
      error: 'Realizaste demasiados envíos en pocos minutos. Por favor, intentá nuevamente en unos minutos.'
    });
    return;
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    const status = err.statusCode || 400;
    sendJson(res, status, {
      ok: false,
      error: status === 413 ? 'El mensaje enviado es demasiado grande.' : 'Formato de solicitud inválido.'
    });
    return;
  }

  // Honeypot anti-bots: si el campo oculto "website" viene completo, simular éxito sin enviar mail
  if (typeof body.website === 'string' && body.website.trim().length > 0) {
    sendJson(res, 200, {
      ok: true,
      message: '¡Gracias! Tu mensaje fue enviado correctamente.'
    });
    return;
  }

  const nombre = String(body.nombre || '').trim();
  const apellido = String(body.apellido || '').trim();
  const email = String(body.email || '').trim();
  const telefono = String(body.telefono || '').trim();
  const mensaje = String(body.mensaje || '').trim();

  if (!nombre || nombre.length > 100) {
    sendJson(res, 400, { ok: false, error: 'Por favor, ingresá un nombre válido.' });
    return;
  }
  if (!apellido || apellido.length > 100) {
    sendJson(res, 400, { ok: false, error: 'Por favor, ingresá un apellido válido.' });
    return;
  }
  if (!email || email.length > 150 || !isValidEmail(email)) {
    sendJson(res, 400, { ok: false, error: 'Por favor, ingresá un correo electrónico válido.' });
    return;
  }
  if (telefono.length > 50) {
    sendJson(res, 400, { ok: false, error: 'El teléfono ingresado es demasiado largo.' });
    return;
  }
  if (!mensaje || mensaje.length < 5 || mensaje.length > 3000) {
    sendJson(res, 400, { ok: false, error: 'Por favor, escribí tu consulta (entre 5 y 3000 caracteres).' });
    return;
  }

  const now = new Date();
  const fechaAr = new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Argentina/Buenos_Aires'
  }).format(now);

  const mailEnabled = isMailEnabled();
  const recordId = `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
  const contactRecord = {
    id: recordId,
    createdAt: now.toISOString(),
    fechaArgentina: fechaAr,
    nombre,
    apellido,
    email,
    telefono: telefono || null,
    mensaje,
    ip: clientIp,
    mailEnabled,
    emailSent: false
  };

  // Guardar siempre la consulta en JSON local (data/contact-messages.json)
  try {
    await appendContactToJson(contactRecord);
  } catch (storageErr) {
    console.error('[contact] Error al guardar consulta en JSON local:', storageErr);
    if (!mailEnabled) {
      sendJson(res, 500, {
        ok: false,
        error: 'No pudimos registrar tu consulta en este momento. Por favor, intentá nuevamente.'
      });
      return;
    }
  }

  // Si el envío por correo está desactivado (MAIL_ENABLED=false), responder éxito tras guardar en JSON
  if (!mailEnabled) {
    console.log(`[contact] Consulta guardada en JSON local (${getContactStoragePath()}) de <${email}> (MAIL_ENABLED=false)`);
    sendJson(res, 200, {
      ok: true,
      saved: true,
      emailSent: false,
      message: '¡Gracias! Tu mensaje fue enviado correctamente. En breve nos pondremos en contacto.'
    });
    return;
  }

  if (!isSmtpConfigured()) {
    console.error('[contact] SMTP no configurado: faltan SMTP_HOST, SMTP_USER o SMTP_PASS en .env');
    await updateContactInJson(recordId, { emailError: 'SMTP_NOT_CONFIGURED' });
    sendJson(res, 503, {
      ok: false,
      error: 'El servicio de correo no está configurado todavía. Por favor, escribinos directamente a info@tecnograficsa.com.ar.'
    });
    return;
  }

  const fullName = sanitizeHeaderValue(`${nombre} ${apellido}`);
  const safeReplyEmail = sanitizeHeaderValue(email);
  const mailFrom = (process.env.MAIL_FROM || `"Web Tecnografic" <${process.env.SMTP_USER.trim()}>`).trim();
  const mailTo = (process.env.MAIL_TO || 'info@tecnograficsa.com.ar').trim();

  const textBody = [
    'Nueva consulta recibida desde tecnograficsa.com.ar',
    '--------------------------------------------------',
    `Fecha:    ${fechaAr} (hora Argentina)`,
    `Nombre:   ${nombre} ${apellido}`,
    `Email:    ${email}`,
    `Teléfono: ${telefono || 'No informado'}`,
    '',
    'Mensaje:',
    mensaje
  ].join('\n');

  const htmlBody = `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #1f2937; max-width: 620px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
      <div style="background-color: #0047a0; color: #ffffff; padding: 20px 24px;">
        <h2 style="margin: 0; font-size: 18px;">Nueva consulta web — Tecnografic S.A.</h2>
        <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.9;">Recibido el ${escapeHtml(fechaAr)} (hora Argentina)</p>
      </div>
      <div style="padding: 24px;">
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #6b7280; width: 110px;"><strong>Nombre:</strong></td>
            <td style="padding: 6px 0;">${escapeHtml(nombre)} ${escapeHtml(apellido)}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280;"><strong>Email:</strong></td>
            <td style="padding: 6px 0;"><a href="mailto:${escapeHtml(email)}" style="color: #0062cc;">${escapeHtml(email)}</a></td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280;"><strong>Teléfono:</strong></td>
            <td style="padding: 6px 0;">${escapeHtml(telefono || 'No informado')}</td>
          </tr>
        </table>
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
          <div style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: #4b5563; margin-bottom: 8px;">Consulta o Mensaje</div>
          <div style="font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(mensaje)}</div>
        </div>
        <p style="margin-top: 18px; font-size: 12px; color: #6b7280;">
          Podés responder directamente a este correo para escribirle a ${escapeHtml(nombre)} (${escapeHtml(email)}).
        </p>
      </div>
    </div>
  `;

  try {
    const transporter = createMailTransporter();
    await transporter.sendMail({
      from: mailFrom,
      to: mailTo,
      replyTo: `"${fullName.replace(/"/g, '')}" <${safeReplyEmail}>`,
      subject: `Nueva consulta web — ${fullName}`,
      text: textBody,
      html: htmlBody
    });

    await updateContactInJson(recordId, { emailSent: true, emailSentAt: new Date().toISOString() });
    console.log(`[contact] Consulta guardada y enviada correctamente de <${safeReplyEmail}> hacia <${mailTo}>`);
    sendJson(res, 200, {
      ok: true,
      saved: true,
      emailSent: true,
      message: '¡Gracias! Tu mensaje fue enviado correctamente. En breve nos pondremos en contacto.'
    });
  } catch (err) {
    console.error('[contact] Error al enviar correo vía SMTP:', err);
    await updateContactInJson(recordId, { emailError: err.message || 'SMTP_ERROR' });
    sendJson(res, 502, {
      ok: false,
      error: 'No pudimos enviar tu mensaje en este momento. Por favor, intentá nuevamente o escribinos a info@tecnograficsa.com.ar.'
    });
  }
}

function isBlockedRelativePath(safeRelativePath) {
  const normalized = safeRelativePath.replace(/\\/g, '/');
  const segments = normalized.split('/').filter(Boolean);
  if (segments.length === 0) return false;
  if (segments.some(seg => seg.startsWith('.'))) return true;
  if (BLOCKED_TOP_LEVEL.has(segments[0].toLowerCase())) return true;
  return false;
}

function sendFile(res, filePath, statusCode = 200) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('500 Internal Server Error');
      return;
    }
    res.writeHead(statusCode, {
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    });
    res.end(content);
  });
}

function handleRequest(req, res) {
  let urlPath;
  try {
    urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('400 Bad Request');
    return;
  }

  // ─── Endpoints API ────────────────────────────────────────────────────────
  if (urlPath === '/api/health') {
    if (req.method !== 'GET') {
      sendJson(res, 405, { ok: false, error: 'Method Not Allowed' });
      return;
    }
    sendJson(res, 200, {
      ok: true,
      mailEnabled: isMailEnabled(),
      smtpConfigured: isSmtpConfigured(),
      mapsConfigured: Boolean((process.env.GOOGLE_MAPS_API_KEY || '').trim())
    });
    return;
  }

  if (urlPath === '/api/config') {
    if (req.method !== 'GET') {
      sendJson(res, 405, { ok: false, error: 'Method Not Allowed' });
      return;
    }
    sendJson(res, 200, {
      googleMapsApiKey: (process.env.GOOGLE_MAPS_API_KEY || '').trim()
    });
    return;
  }

  if (urlPath === '/api/contact') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { ok: false, error: 'Method Not Allowed' });
      return;
    }
    handleContactPost(req, res);
    return;
  }

  if (urlPath.startsWith('/api/')) {
    sendJson(res, 404, { ok: false, error: 'Endpoint no encontrado' });
    return;
  }

  // ─── Archivos estáticos y fallback SPA ────────────────────────────────────
  if (urlPath === '/' || urlPath === '/index.html') {
    sendSeoIndexHtml(res, req.url);
    return;
  }

  const safeRelativePath = path
    .normalize(urlPath)
    .replace(/^([/\\]*\.\.[/\\])+/, '')
    .replace(/^[/\\]+/, '');

  if (isBlockedRelativePath(safeRelativePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
    return;
  }

  const requestedPath = path.resolve(ROOT_DIR, safeRelativePath);
  if (requestedPath !== ROOT_DIR && !requestedPath.startsWith(ROOT_DIR + path.sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(requestedPath, (err, stats) => {
    if (!err && stats.isFile()) {
      sendFile(res, requestedPath);
      return;
    }

    if (urlPath.startsWith('/assets/') || urlPath.startsWith('/views/')) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    sendSeoIndexHtml(res, req.url);
  });
}

function startServer() {
  const server = http.createServer(handleRequest);

  server.listen(PORT, HOST, () => {
    console.log(`Servidor Tecnografic corriendo en http://${HOST}:${PORT}`);
    console.log(`  Envío de mails (MAIL_ENABLED): ${isMailEnabled() ? 'ACTIVO' : 'DESACTIVADO (solo guarda en data/contact-messages.json)'}`);
    console.log(`  SMTP configurado: ${isSmtpConfigured() ? 'SÍ' : 'NO (completar .env)'}`);
    console.log(`  Google Maps API Key configurada: ${(process.env.GOOGLE_MAPS_API_KEY || '').trim() ? 'SÍ' : 'NO (completar .env)'}`);
  });
}

// ─── Modos CLI para probar SMTP fácilmente ────────────────────────────────────
async function runSmtpCli(sendTestEmail) {
  if (!isSmtpConfigured()) {
    console.error('ERROR: Faltan variables SMTP_HOST, SMTP_USER o SMTP_PASS en el archivo .env');
    process.exit(1);
  }

  const host = process.env.SMTP_HOST.trim();
  const port = Number(process.env.SMTP_PORT) || 587;
  const secureEnv = (process.env.SMTP_SECURE || '').trim().toLowerCase();
  const secure = secureEnv ? secureEnv === 'true' : port === 465;

  console.log(`Probando conexión SMTP contra ${host}:${port} (secure=${secure}) como ${process.env.SMTP_USER.trim()}...`);

  try {
    const transporter = createMailTransporter();
    await transporter.verify();
    console.log('OK: Conexión y autenticación SMTP verificadas correctamente.');

    if (sendTestEmail) {
      const mailFrom = (process.env.MAIL_FROM || `"Web Tecnografic" <${process.env.SMTP_USER.trim()}>`).trim();
      const mailTo = (process.env.MAIL_TO || 'info@tecnograficsa.com.ar').trim();
      console.log(`Enviando correo de prueba a ${mailTo}...`);

      const info = await transporter.sendMail({
        from: mailFrom,
        to: mailTo,
        subject: 'Prueba de correo — Sitio Web Tecnografic S.A.',
        text: 'Este es un correo de prueba enviado desde el servidor web de Tecnografic S.A. para verificar la configuración SMTP.'
      });

      console.log(`OK: Correo de prueba enviado correctamente (messageId: ${info.messageId}).`);
    }
    process.exit(0);
  } catch (err) {
    console.error('ERROR SMTP:', err.message || err);
    process.exit(1);
  }
}

if (require.main === module) {
  if (process.argv.includes('--verify-smtp')) {
    runSmtpCli(false);
  } else if (process.argv.includes('--send-test')) {
    runSmtpCli(true);
  } else {
    startServer();
  }
}

module.exports = { handleRequest, startServer };
