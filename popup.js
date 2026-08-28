const soundcloudDomain = 'soundcloud.com';
const apiURL = 'https://soundcloud.com/oembed?format=json&url=';
const trackIDRegex = new RegExp(
    String.raw`(%[0-9A-F]+)tracks\1(\d{3,})`
);

const trackIDElem = document.getElementById('result-text');
const copyButtonElem = document.getElementById('copy-button');

document.getElementById('get-id').addEventListener('click', onButtonClicked);
copyButtonElem.addEventListener('click', onCopyButtonClicked);

// ポップアップ上でエラーやメッセージを出力する
function showUserMessage(message, isError = true) {
    const hintElem = document.getElementById('hint');
    hintElem.textContent = message;

    // エラーか否かに応じてメッセージの色を変更する
    if (isError) {
        hintElem.style.color = '#f55';
    } else {
        hintElem.style.color = '#333';
    }
}

async function tryCopyText(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}

async function onCopyButtonClicked() {
    const trackID = trackIDElem.value;

    // トラックIDをクリップボードにコピーする
    const copied = await tryCopyText(trackID);
    if (copied) {
        showUserMessage('トラックIDをクリップボードにコピーしました', false);
    } else {
        showUserMessage('コピーに失敗しました');
    }
}

async function onButtonClicked() {
    // 現在フォーカスしているタブを取得する
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) {
        showUserMessage('内部エラー\nURLの取得に失敗しました');
        return;
    }

    const url = tab.url;
    const urlObj = new URL(url);

    // URLがSoundCloudのドメインかどうか確認する
    if (urlObj.hostname == soundcloudDomain || urlObj.hostname.endsWith('.' + soundcloudDomain)) {
        // oEmbedに楽曲ページの埋め込みをリクエストする
        let response;
        try {
            response = await fetch(apiURL + encodeURIComponent(url));
            if (!response.ok) {
                showUserMessage(`HTTPエラー\n${ response.status }`);
                return;
            }
        } catch (error) {
            showUserMessage(`ネットワークエラー\n${ error }`);
            return;
        }

        // レスポンスのJSONデータを取得する
        let responseData;
        try {
            responseData = await response.json();
        } catch {
            showUserMessage('内部エラー\n不正なレスポンスを受け取りました');
            return;
        }

        // JSONデータにキー「html」が含まれるかどうかを確認する
        if (
            responseData === null ||
            typeof responseData !== 'object' ||
            !('html' in responseData)
        ) {
            showUserMessage('内部エラー\nトラックIDの解析に失敗しました');
            return;
        }

        // 埋め込み用のHTMLのソースからトラックIDを抽出する
        const responseHTML = responseData['html'];
        const idMatches = trackIDRegex.exec(responseHTML);
        if (idMatches === null) {
            showUserMessage('内部エラー\nトラックIDの解析に失敗しました');
            return;
        }
        
        const trackID = idMatches[2];
        
        // トラックIDをクリップボードにコピー
        const copied = await tryCopyText(trackID);

        // トラックIDを表示する
        trackIDElem.value = trackID;
        copyButtonElem.disabled = false;

        if (copied) {
            showUserMessage('トラックIDをクリップボードにコピーしました', false);
        } else {
            showUserMessage('トラックIDを抽出しました', false);
        }
    } else {
        showUserMessage('SoundCloudの楽曲ページを開いてください');
    }
}