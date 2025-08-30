document.addEventListener("DOMContentLoaded", async () => {
    const initialValueArea = document.getElementById("initialValue");
    const randomBtn = document.getElementById("randomBtn");
    const qrCanvas = document.getElementById("qrCanvas");
    const saveBtn = document.getElementById("saveBtn");

    let initialValue = "";

    // ==============================
    // 初期値読み込み
    // ==============================
    const initRes = await fetch(`data/initial.json?ts=${Date.now()}`);
    const initJson = await initRes.json();
    initialValue = initJson.initial || "";

    // 初期表示
    initialValueArea.value = "";

    // 初期表示initialJsonValueにinitialValueを入れる
    document.getElementById("initialJsonValue").textContent = initialValue;


    //------------------
    // ランダム生成
    //------------------
    randomBtn.addEventListener("click", () => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let randStr = "";
        for (let i = 0; i < 20; i++) {
            randStr += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        initialValueArea.value = randStr;
        generateQR();

        // ✅ 値が更新された後に履歴を追加
        addHistory();
    });

    // 入力時にリアルタイム更新
    initialValueArea.addEventListener("input", () => {
        generateQR();
    });

    // ==============================
    // QRコード生成
    // ==============================
    let currentQRText = ""; // グローバル変数に追加

    function generateQR() {
        const addValue = initialValueArea.value.replace(/[^a-zA-Z0-9]/g, "");
        const qrText = initialValue + addValue;

        qrCanvas.innerHTML = "";

        // 1. QRを生成
        const qr = new QRCode(qrCanvas, {
            text: qrText,
            width: 320,
            height: 320,
            correctLevel: QRCode.CorrectLevel.H,
            useSVG: false
        });

        // 2. 少し待って canvas を取得
        setTimeout(() => {
            const originalCanvas = qrCanvas.querySelector("canvas");
            if (!originalCanvas) return;

            // 3. 新しい canvas を作ってコピー
            const canvas = document.createElement("canvas");
            canvas.width = originalCanvas.width;
            canvas.height = originalCanvas.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(originalCanvas, 0, 0);

            // 4. ロゴを中央に描く
            const logo = new Image();
            logo.src = "assets/center-mark.png";
            logo.onload = () => {
                const size = 64;
                const x = (canvas.width - size) / 2;
                const y = (canvas.height - size) / 2;
                ctx.fillStyle = "white";
                ctx.fillRect(x, y, size, size);
                ctx.drawImage(logo, x, y, size, size);

                // 5. 元の canvas を置き換える
                qrCanvas.innerHTML = "";
                qrCanvas.appendChild(canvas);
            };
        }, 10); // QR描画が安定するまで少し余裕を持つ

        currentQRText = qrText; // ここで保持
    }
    //------------------
    // QRコードテキスト履歴
    //------------------
    const historyList = document.getElementById("qrHistory");

    function addHistory() {
        // currentQRText の値を履歴に追加
        const li = document.createElement("li");
        li.textContent = currentQRText;
        historyList.prepend(li);

        // 履歴がx件を超えたら古いものを削除
        while (historyList.children.length > 30) {
            historyList.removeChild(historyList.lastChild);
        }
    }

    // ==============================
    // 保存設定オプションの読み込み
    // ==============================
    async function loadOptions() {
        const res = await fetch("data/options.json");
        const data = await res.json();
        window.optionsData = data; // ここでグローバルに保持

        ["回避率", "体格", "色", "頭", "アンテナ"].forEach((key) => {
            const select = document.getElementById(key);
            if (select) {
                let options = data[key] || [];
                // pickup:true を先頭にする
                options.sort((a, b) => (b.pickup ? 1 : 0) - (a.pickup ? 1 : 0));
                options.forEach((opt) => {
                    const o = document.createElement("option");
                    o.value = opt.value;
                    o.textContent = (opt.pickup ? "★ " : "") + opt.label;
                    select.appendChild(o);
                });
            }
        });
    }
    loadOptions();

    // ==============================
    // 保存処理
    // ==============================
    saveBtn.addEventListener("click", () => {
        const name = document.getElementById("name").value;
        const features = document.getElementById("features").value;
        const options = {};
        ["回避率", "体格", "色", "頭", "アンテナ"].forEach((key) => {
            const select = document.getElementById(key);
            const selectedValue = select.value;

            // グローバルの optionsData から label を取得
            const label = (window.optionsData[key] || []).find(o => o.value === selectedValue)?.label || selectedValue;

            options[key] = label; // label を格納
        });

        const qrCanvasEl = qrCanvas.querySelector("canvas");
        const qrImg = new Image();
        qrImg.src = qrCanvasEl.toDataURL("image/png");
        qrImg.onload = () => {
            const padding = 20; // 周囲の余白
            const qrWidth = 320;
            const textWidth = 240;

            // キャンバスサイズ：左右の余白 + QR + テキスト + 余白
            const canvasWidth = padding + qrWidth + padding + textWidth + padding;
            const canvasHeight = qrWidth + padding * 2; // 上下の余白も考慮

            const canvas = document.createElement("canvas");
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            const ctx = canvas.getContext("2d");

            // 背景を白に
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);

            // 左側QRコード（左余白あり）
            ctx.drawImage(qrImg, padding, padding, qrWidth, qrWidth);

            // 右側テキストの開始位置（QR右 + 左右余白）
            const textX = padding + qrWidth + padding;
            let space_y = padding + 30; // 上余白込みのテキスト開始位置

            // 名前
            ctx.font = "bold 20px sans-serif";
            ctx.fillStyle = "#000";
            ctx.fillText(name, textX, space_y);
            space_y += 30;

            // その他オプション
            ctx.font = "16px sans-serif";
            Object.keys(options).forEach((k) => {
                ctx.fillText(`${k}: ${options[k]}`, textX, space_y, textWidth);
                space_y += 30;
            });

            // 特徴
            const featureLines = [`メモ:`, features]; // 改行したい部分で配列に分ける
            let lineY = space_y; // 描画開始Y座標

            ctx.font = "16px sans-serif";
            ctx.fillStyle = "#000";

            featureLines.forEach(line => {
                ctx.fillText(line, textX, lineY, textWidth);
                lineY += 20; // 行間、必要に応じて調整
            });

            // QRコードの文字列も表示
            ctx.font = "14px monospace"; // 小さめ
            ctx.fillText(currentQRText, textX, 300, textWidth);

            // 小さいロゴを左下に置く
            const logo = new Image();
            logo.src = "assets/center-mark.png";
            logo.onload = () => {
                const logoSize = 32;
                const logoX = textX; // 右側テキスト領域の左端
                const logoY = canvasHeight - padding - logoSize;
                ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);

                // ここでモーダル表示やダウンロード処理
                const resultImg = canvas.toDataURL("image/png");
                document.getElementById("resultImage").src = resultImg;
                document.getElementById("resultModal").style.display = "flex";

                document.getElementById("downloadBtn").onclick = () => {
                    const a = document.createElement("a");
                    a.href = resultImg;
                    a.download = `${name || "qr"}.png`;
                    a.click();
                };
            };
        };
    });

    // ==============================
    // モーダル (利用規約・使い方・今回のイベント)
    // ==============================
    function openModal() {
        document.getElementById("infoModal").style.display = "flex"; // display:flexで中央表示
    }

    function closeModal() {
        document.getElementById("infoModal").style.display = "none";
    }

    async function loadModals() {
        const res = await fetch("data/modals.json");
        const modals = await res.json();

        ["利用規約", "使い方", "今回のイベント"].forEach((key) => {
            const btn = document.getElementById(`${key}Btn`);
            const modal = document.getElementById("infoModal");
            const left = modal.querySelector(".modal-left");
            const right = modal.querySelector(".modal-right");
            const closeBtns = modal.querySelectorAll(".closeBtn");

            if (btn) {
                btn.addEventListener("click", () => {
                    // 左に目次
                    left.innerHTML = "";
                    modals[key].sections.forEach((section, idx) => {
                        const item = document.createElement("div");
                        item.textContent = section.title;
                        item.classList.add("menu-item");
                        if (idx === 0) item.classList.add("active");
                        item.addEventListener("click", () => {
                            left.querySelectorAll(".menu-item").forEach((el) => el.classList.remove("active"));
                            item.classList.add("active");
                            right.innerHTML = section.content;
                        });
                        left.appendChild(item);
                    });
                    // 最初の内容を右に表示
                    right.innerHTML = modals[key].sections[0].content;

                    modal.style.display = "flex";
                });
            }

            // ページ内の全てのモーダルの×ボタンを対象
            document.querySelectorAll(".modal .closeBtn").forEach((btn) => {
                btn.addEventListener("click", () => {
                    // このボタンが属するモーダルだけ閉じる
                    const modal = btn.closest(".modal");
                    if (modal) modal.style.display = "none";
                });
            });
        });
    }
    loadModals();

    generateQR();
});