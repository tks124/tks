<script>
    const FULL_URL = "https://tks124.github.io/rjyz/";
    const BLOCK_URL = "https://tks124.github.io/jg/";
    const AUTH_KEY = "sk124_auth_token";
    
    // --- 安全配置 ---
    const MAX_VISITS = 20;      // 允许的最大访问次数
    const TIME_WINDOW = 60000;  // 时间窗口 (毫秒)，例如 60000 = 1分钟
    const VISIT_COUNT_KEY = "sk124_visit_count";
    const VISIT_TIME_KEY = "sk124_visit_time";

    const validCodes = [
        "1939", 
        "0124", 
        "tks124",
       "3120",
        "3412"
    ];

    // ==========================================
    // 🛡️ 新增：访问频率检测逻辑
    // ==========================================
    function securityCheck() {
        const now = Date.now();
        let count = parseInt(localStorage.getItem(VISIT_COUNT_KEY)) || 0;
        let lastTime = parseInt(localStorage.getItem(VISIT_TIME_KEY)) || 0;

        // 如果超过了时间窗口，重置计数
        if (now - lastTime > TIME_WINDOW) {
            count = 1;
            localStorage.setItem(VISIT_TIME_KEY, now.toString());
        } else {
            // 在时间窗口内，计数加一
            count++;
        }

        localStorage.setItem(VISIT_COUNT_KEY, count.toString());

        // 如果超过限制，跳转
        if (count > MAX_VISITS) {
            window.location.replace(BLOCK_URL);
        }
    }

    // 页面加载时立即执行检测
    securityCheck();
    // ==========================================

    window.onload = function() {
        if (localStorage.getItem(AUTH_KEY) === "true") {
            window.location.replace(FULL_URL);
        }
    };

    function openModal() {
        document.getElementById('codeModal').style.display = 'flex';
        setTimeout(() => {
            document.getElementById('inviteInput').focus();
        }, 100);
    }

    function closeModal() {
        document.getElementById('codeModal').style.display = 'none';
        document.getElementById('inviteInput').value = '';
    }

    function verifyCode() {
        const inputElement = document.getElementById('inviteInput');
        const userInput = inputElement.value.trim();

        if (!userInput) {
            alert("请输入邀请码！");
            return;
        }

        if (validCodes.includes(userInput)) {
            localStorage.setItem(AUTH_KEY, "true");
            alert("验证成功！正在跳转...");
            closeModal();
            window.location.href = FULL_URL;
        } else {
            alert("邀请码无效，请核对后重试。");
            inputElement.value = '';
            inputElement.focus();
        }
    }

    document.getElementById('inviteInput').addEventListener("keypress", function(e) {
        if (e.key === "Enter") {
            verifyCode();
        }
    });
</script>