// • Feature : Nanobanana
// • Credits : https://whatsapp.com/channel/0029Vb4fjWE1yT25R7epR110

import uploadImage from '../lib/uploadImage.js';
import fetch from 'node-fetch';

let handler = async (m, { conn, text, usedPrefix, command }) => {
    const q = m.quoted ? m.quoted : m;
    const mime = (q.msg || q).mimetype || q.mediaType || '';

    if (!/image/.test(mime)) {
        throw `Format salah! Reply ke sebuah gambar dengan caption:\n*${usedPrefix + command} <prompt>*\n\n*Contoh:*\n${usedPrefix + command} to ghibli style art`;
    }

    if (!text) {
        throw `Prompt tidak boleh kosong! Reply ke sebuah gambar dengan caption:\n*${usedPrefix + command} <prompt>*\n\n*Contoh:*\n${usedPrefix + command} to ghibli style art`;
    }

    // Validasi panjang prompt
    if (text.length > 500) {
        throw `Prompt terlalu panjang! Maksimal 500 karakter.`;
    }

    let processingMsg;
    try {
        processingMsg = await m.reply('⏳ Sedang memproses gambar dengan Nano-Banana AI...');

        const img = await q.download();
        if (!img || img.length === 0) {
            throw new Error('Gagal mendownload gambar!');
        }

        if (img.length > 10 * 1024 * 1024) {
            throw new Error('Ukuran gambar terlalu besar! Maksimal 10MB.');
        }

        const imageUrl = await uploadImage(img);
        if (!imageUrl) {
            throw new Error('Gagal mengunggah gambar ke server!');
        }

        if (!imageUrl.startsWith('http')) {
            throw new Error('URL gambar tidak valid!');
        }

        await conn.sendMessage(m.chat, { 
            text: '🎨 Gambar berhasil diupload, sedang memproses dengan AI...', 
            edit: processingMsg.key 
        });

        const makeRequest = async (retries = 3) => {
            for (let i = 0; i < retries; i++) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 60000);

                    const apiUrl = `https://api.platform.web.id/nano-banana?imageUrl=${encodeURIComponent(imageUrl)}&prompt=${encodeURIComponent(text)}`;
                    
                    const response = await fetch(apiUrl, {
                        method: 'GET',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Accept': 'application/json',
                            'Connection': 'keep-alive'
                        },
                        signal: controller.signal,
                        timeout: 60000
                    });

                    clearTimeout(timeoutId);

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    const json = await response.json();
                    return json;

                } catch (error) {
                    console.log(`Attempt ${i + 1} failed:`, error.message);
                    
                    if (i === retries - 1) throw error;
                    
                    await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
                    
                    await conn.sendMessage(m.chat, { 
                        text: `🔄 Mencoba ulang... (${i + 2}/${retries})`, 
                        edit: processingMsg.key 
                    });
                }
            }
        };

        const json = await makeRequest();

        if (!json) {
            throw new Error('Response kosong dari server');
        }

        if (!json.success) {
            throw new Error(json.message || 'API mengembalikan status gagal');
        }

        if (!json.result || !json.result.results || !Array.isArray(json.result.results)) {
            throw new Error('Format response tidak valid dari API');
        }

        if (json.result.results.length === 0) {
            throw new Error('Tidak ada hasil yang dihasilkan oleh AI');
        }

        const resultUrl = json.result.results[0]?.url;
        if (!resultUrl || !resultUrl.startsWith('http')) {
            throw new Error('URL hasil tidak valid');
        }

        await conn.sendMessage(m.chat, { 
            text: '✅ Berhasil! Mengirim hasil...', 
            edit: processingMsg.key 
        });

        await conn.sendMessage(m.chat, { 
            image: { url: resultUrl }, 
            caption: `✨ *Nano-Banana AI Result*\n\n*Prompt:* ${text}\n*Processed by:* @${m.sender.split('@')[0]}`,
            mentions: [m.sender]
        }, { quoted: m });

        // Hapus pesan processing
        try {
            await conn.sendMessage(m.chat, { delete: processingMsg.key });
        } catch (e) {
        }

    } catch (error) {
        console.error('Error pada plugin Nano-Banana:', error);
        
        if (processingMsg) {
            try {
                await conn.sendMessage(m.chat, { delete: processingMsg.key });
            } catch (e) {
                // Ignore delete error
            }
        }

        let errorMessage = '🚨 Terjadi kesalahan: ';
        
        if (error.name === 'AbortError' || error.message.includes('timeout')) {
            errorMessage += 'Request timeout. Server terlalu lama merespons, coba lagi nanti.';
        } else if (error.message.includes('socket hang up') || error.message.includes('ECONNRESET')) {
            errorMessage += 'Koneksi terputus. Coba lagi dalam beberapa saat.';
        } else if (error.message.includes('invalid parameter')) {
            errorMessage += 'Parameter tidak valid. Pastikan gambar dan prompt sudah benar.';
        } else if (error.message.includes('HTTP 429')) {
            errorMessage += 'Terlalu banyak request. Tunggu sebentar dan coba lagi.';
        } else if (error.message.includes('HTTP 500')) {
            errorMessage += 'Server sedang bermasalah. Coba lagi nanti.';
        } else if (error.message.includes('HTTP')) {
            errorMessage += `Server error: ${error.message}`;
        } else {
            errorMessage += error.message || 'Kesalahan tidak diketahui';
        }

        await m.reply(errorMessage + '\n\n💡 *Tips:*\n• Pastikan gambar tidak lebih dari 10MB\n• Gunakan prompt dalam bahasa Inggris\n• Coba lagi dalam beberapa menit jika server sibuk');
    }
};

handler.help = ['nanobanana <prompt>'];
handler.tags = ['ai', 'tools'];
handler.command = ['nanobanana', 'nb'];
handler.limit = true;
handler.premium = false;

export default handler;
