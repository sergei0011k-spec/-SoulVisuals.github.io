window.hcaptchaComplete = function (token) {
    const form = document.getElementById('signup-form');
    if (!form) return;
    form.dataset.hcaptchaToken = token;
    form.querySelector('button[type="submit"]').disabled = false;
    document.getElementById('signup-status').textContent = '';
};

window.hcaptchaExpired = function () {
    const form = document.getElementById('signup-form');
    if (!form) return;
    delete form.dataset.hcaptchaToken;
    form.querySelector('button[type="submit"]').disabled = true;
};

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('signup-form');
    if (!form) return;

    const status = document.getElementById('signup-status');
    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        status.classList.remove('is-success');
        status.textContent = '';

        const password = form.elements.password.value;
        const confirmation = form.elements.password_confirmation.value;
        if (password !== confirmation) {
            status.textContent = 'Пароли не совпадают.';
            return;
        }

        const hcaptchaToken = form.dataset.hcaptchaToken || '';
        if (!hcaptchaToken) {
            status.textContent = 'Подтвердите проверку hCaptcha.';
            return;
        }

        try {
            const payload = Object.fromEntries(new FormData(form).entries());
            payload.hcaptcha_token = hcaptchaToken;
            const response = await fetch('api/signup.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Не удалось создать аккаунт.');

            status.classList.add('is-success');
            status.textContent = 'Аккаунт создан. Перенаправление в профиль...';
            window.location.assign('profile.php');
        } catch (error) {
            status.textContent = error.message;
            delete form.dataset.hcaptchaToken;
            form.querySelector('button[type="submit"]').disabled = true;
            if (window.hcaptcha) window.hcaptcha.reset();
        }
    });
});

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('login-form');
    if (!form) return;

    const status = document.getElementById('login-status');
    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        status.classList.remove('is-success');
        status.textContent = 'Вход...';

        try {
            const waitingForTwofactor = form.dataset.awaitingTwofactor === 'true';
            const response = await fetch(waitingForTwofactor ? 'api/v1/index.php/verify-2fa' : 'api/login.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(waitingForTwofactor ? { code: form.elements.twofactor_code.value } : Object.fromEntries(new FormData(form).entries()))
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Не удалось выполнить вход.');
            if (result.requires_2fa) {
                form.dataset.awaitingTwofactor = 'true';
                form.querySelector('[data-login-twofactor]').hidden = false;
                form.elements.twofactor_code.required = true;
                status.textContent = 'Введите код Google Authenticator.';
                return;
            }
            status.classList.add('is-success');
            status.textContent = 'Вход выполнен. Открываем профиль...';
            const redirect = new URLSearchParams(window.location.search).get('redirect');
            const destination = redirect && redirect.startsWith('/api/v2/sync?') ? redirect : 'profile.php';
            window.location.assign(destination);
        } catch (error) {
            status.textContent = error.message;
        }
    });
});

document.addEventListener('contextmenu', function (event) {
    event.preventDefault();
});

document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-password-toggle]').forEach(function (button) {
        button.addEventListener('click', function () {
            const input = button.previousElementSibling;
            const visible = input.type === 'text';
            input.type = visible ? 'password' : 'text';
            button.classList.toggle('is-visible', !visible);
            button.setAttribute('aria-label', visible ? 'Показать пароль' : 'Скрыть пароль');
            button.setAttribute('title', visible ? 'Показать пароль' : 'Скрыть пароль');
        });
    });

    async function toolsRequest(path, payload) { const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload || {}) }); const result = await response.json(); if (!response.ok || result.error) throw new Error(result.error || 'Не удалось выполнить действие.'); return result; }
    const passwordForm = document.querySelector('[data-password-form]');
    if (passwordForm) passwordForm.addEventListener('submit', async function (event) { event.preventDefault(); const status = document.querySelector('[data-password-status]'); if (passwordForm.elements.newPassword.value !== passwordForm.elements.confirmation.value) { status.textContent = 'Пароли не совпадают.'; return; } try { await toolsRequest('api/v1/index.php/user/changePassword', { oldPassword: passwordForm.elements.oldPassword.value, newPassword: passwordForm.elements.newPassword.value }); status.textContent = 'Пароль изменен.'; passwordForm.reset(); } catch (error) { status.textContent = error.message; } });
    const twofactorStatus = document.querySelector('[data-twofactor-status]');
    const generate = document.querySelector('[data-twofactor-generate]');
    if (generate) generate.addEventListener('click', async function () { try { const result = await toolsRequest('api/v1/index.php/2fa/generate'); document.querySelector('[data-twofactor-qr]').src = 'data:image/png;base64,' + result.qr; document.querySelector('[data-twofactor-setup]').hidden = false; twofactorStatus.textContent = 'Отсканируйте QR-код и подтвердите код.'; } catch (error) { twofactorStatus.textContent = error.message; } });
    const verify = document.querySelector('[data-twofactor-verify]');
    if (verify) verify.addEventListener('click', async function () { try { await toolsRequest('api/v1/index.php/2fa/verify', { code: document.querySelector('[data-twofactor-code]').value }); twofactorStatus.textContent = 'Google Authenticator подключен.'; window.location.reload(); } catch (error) { twofactorStatus.textContent = error.message; } });
    const disable = document.querySelector('[data-twofactor-disable]');
    if (disable) disable.addEventListener('click', async function () { try { await toolsRequest('api/v1/index.php/2fa/unverify', { code: document.querySelector('[data-twofactor-disable-code]').value }); twofactorStatus.textContent = 'Google Authenticator отключен.'; window.location.reload(); } catch (error) { twofactorStatus.textContent = error.message; } });
});

document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape' || !document.querySelector('[data-close-auth]')) return;
    window.location.assign('index.php');
});

document.addEventListener('copy', function (event) { event.preventDefault(); });
document.addEventListener('cut', function (event) { event.preventDefault(); });
document.addEventListener('dragstart', function (event) { event.preventDefault(); });
document.addEventListener('selectstart', function (event) {
    if (!event.target.closest('input, textarea')) event.preventDefault();
});

window.addEventListener('beforeprint', function () {
    document.body.classList.add('print-blocked');
});

window.addEventListener('afterprint', function () {
    document.body.classList.remove('print-blocked');
});

document.addEventListener('keydown', function (event) {
    const key = event.key.toLowerCase();
    const inspectorShortcut = event.key === 'F12'
        || ((event.ctrlKey || event.metaKey) && event.shiftKey && ['i', 'j', 'c'].includes(key))
        || ((event.ctrlKey || event.metaKey) && ['u', 's'].includes(key));
    if (inspectorShortcut) event.preventDefault();
});

document.addEventListener('DOMContentLoaded', function () {
    const search = document.querySelector('[data-user-search]');
    const status = document.querySelector('[data-admin-status]');
    if (!search && !status) return;

    document.querySelectorAll('[data-key-form], [data-funpay-key-form], [data-promo-form], .admin-grant-form, .admin-role-form, .admin-ban-form, [data-client-upload-form]').forEach(function (form) {
        form.addEventListener('submit', function (event) { event.preventDefault(); }, true);
    });

    async function sendAdmin(payload) {
        const response = await fetch('api/admin.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Не удалось сохранить изменения.');
        return result;
    }

    function report(message, reload) {
        if (status) status.textContent = message;
    }

    if (search) {
        search.addEventListener('input', function () {
            const value = search.value.trim().toLocaleLowerCase();
            document.querySelectorAll('[data-user-card]').forEach(function (card) {
                card.hidden = value !== '' && !card.dataset.username.includes(value);
            });
        });
    }

    document.querySelectorAll('.admin-grant-form').forEach(function (form) {
        form.addEventListener('submit', async function (event) {
            event.preventDefault();
            const actions = form.closest('[data-user-id]');
            try {
                await sendAdmin({ action: 'grant_subscription', user_id: actions.dataset.userId, type: form.elements.type.value, days: form.elements.days.value });
                report('Подписка выдана.', true);
            } catch (error) { report(error.message, false); }
        });
    });

    document.querySelectorAll('[data-admin-action]').forEach(function (button) {
        button.addEventListener('click', async function () {
            const action = button.dataset.adminAction;
            if ((action === 'cancel_subscription' || action === 'delete_user' || action === 'ban_chat') && !window.confirm('Подтвердите действие.')) return;
            try {
                await sendAdmin({ action: action, user_id: button.closest('[data-user-id]').dataset.userId });
                report('Изменения сохранены.', true);
            } catch (error) { report(error.message, false); }
        });
    });

    const keyForm = document.querySelector('[data-key-form]');
    if (keyForm) {
        keyForm.addEventListener('submit', async function (event) {
            event.preventDefault();
            try {
                await sendAdmin({ action: 'create_key', type: keyForm.elements.type.value, days: keyForm.elements.days.value });
                report('Ключ создан.', true);
            } catch (error) { report(error.message, false); }
        });
    }

    const funpayKeyForm = document.querySelector('[data-funpay-key-form]');
    if (funpayKeyForm) {
        funpayKeyForm.addEventListener('submit', async function (event) {
            event.preventDefault();
            const funpayStatus = document.querySelector('[data-funpay-status]');
            const button = funpayKeyForm.querySelector('button[type="submit"]');
            button.disabled = true;
            funpayStatus.textContent = 'Создаем ключи...';
            try {
                const result = await sendAdmin({ action: 'create_funpay_keys', type: funpayKeyForm.elements.type.value, quantity: funpayKeyForm.elements.quantity.value });
                const blob = new Blob([result.keys.join('\r\n') + '\r\n'], { type: 'text/plain;charset=utf-8' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'aethra-funpay-' + result.type + '-' + Date.now() + '.txt';
                link.click();
                URL.revokeObjectURL(link.href);
                funpayStatus.textContent = 'Создано ключей: ' + result.keys.length + '.';
            } catch (error) {
                funpayStatus.textContent = error.message;
            } finally {
                button.disabled = false;
            }
        });
    }
    const promoForm = document.querySelector('[data-promo-form]');
    if (promoForm) promoForm.addEventListener('submit', async function (event) { event.preventDefault(); try { await sendAdmin({ action: 'create_promocode', name: promoForm.elements.name.value, discount: promoForm.elements.discount.value }); report('Промокод создан.', true); } catch (error) { report(error.message, false); } });
    const rollypayTest = document.querySelector('[data-rollypay-test]');
    if (rollypayTest) rollypayTest.addEventListener('change', async function () { try { await sendAdmin({ action: 'set_rollypay_test_mode', enabled: rollypayTest.checked }); report(rollypayTest.checked ? 'Sandbox RollyPay включен.' : 'Sandbox RollyPay выключен.', false); } catch (error) { rollypayTest.checked = !rollypayTest.checked; report(error.message, false); } });
    document.querySelectorAll('[data-delete-promo]').forEach(function (button) { button.addEventListener('click', async function () { if (!window.confirm('Удалить промокод?')) return; try { await sendAdmin({ action: 'delete_promocode', name: button.dataset.deletePromo }); report('Промокод удален.', true); } catch (error) { report(error.message, false); } }); });

    const clientUploadForm = document.querySelector('[data-client-upload-form]');
    if (clientUploadForm) {
        clientUploadForm.addEventListener('submit', async function (event) {
            event.preventDefault();
            const uploadStatus = document.querySelector('[data-client-upload-status]');
            const button = clientUploadForm.querySelector('button[type="submit"]');
            button.disabled = true;
            uploadStatus.textContent = 'Загружаем JAR...';
            try {
                const response = await fetch('api/upload_client.php', { method: 'POST', body: new FormData(clientUploadForm) });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Не удалось загрузить JAR.');
                uploadStatus.textContent = result.success;
                clientUploadForm.reset();
            } catch (error) { uploadStatus.textContent = error.message; } finally { button.disabled = false; }
        });
    }

    document.querySelectorAll('[data-delete-key]').forEach(function (button) {
        button.addEventListener('click', async function () {
            if (!window.confirm('Удалить неиспользованный ключ?')) return;
            try {
                await sendAdmin({ action: 'delete_key', key: button.dataset.deleteKey });
                report('Ключ удален.', true);
            } catch (error) { report(error.message, false); }
        });
    });
});

document.addEventListener('DOMContentLoaded', function () {
    const modals = document.querySelectorAll('.modal');
    if (!modals.length) return;

    function closeModal(modal) {
        modal.hidden = true;
        document.body.classList.remove('modal-open');
    }

    document.querySelectorAll('[data-open-modal]').forEach(function (button) {
        button.addEventListener('click', function () {
            const modal = document.getElementById(button.dataset.openModal);
            if (!modal) return;
            if (modal.id === 'purchase-modal' && button.dataset.purchaseName) {
                const title = modal.querySelector('[data-purchase-title]');
                if (title) title.textContent = button.dataset.purchaseTitle;
                const regular = modal.querySelector('[data-purchase-regular]');
                if (regular) {
                    regular.textContent = button.dataset.purchaseRegular;
                    regular.hidden = !button.dataset.purchaseRegular;
                }
                const sale = modal.querySelector('[data-purchase-sale]');
                if (sale) sale.textContent = button.dataset.purchaseSale;
            }
            modal.hidden = false;
            document.body.classList.add('modal-open');
            window.dispatchEvent(new Event('resize'));
            const input = modal.querySelector('input');
            if (input) input.focus();
        });
    });

    document.querySelectorAll('[data-close-modal]').forEach(function (button) {
        button.addEventListener('click', function () { closeModal(button.closest('.modal')); });
    });

    document.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') return;
        modals.forEach(function (modal) { if (!modal.hidden) closeModal(modal); });
    });

    const purchaseModal = document.getElementById('purchase-modal');
    if (purchaseModal) {
        const status = purchaseModal.querySelector('[data-purchase-status]');
        const promoInput = purchaseModal.querySelector('[data-promo-input]');
        const paymentEmail = purchaseModal.querySelector('[data-payment-email]');
        const terms = purchaseModal.querySelector('[data-purchase-terms]');
        const payButton = purchaseModal.querySelector('[data-start-payment]');
        const funpayButton = purchaseModal.querySelector('[data-funpay-payment]');
        let appliedPromo = '';
        let discount = 0;
        let paymentProvider = 'rollypay';

        function updateTotal() {
            const product = purchaseModal.querySelector('.product-option.is-selected');
            const amount = Number(product.dataset.productAmount);
            const total = (amount * (100 - discount) / 100).toFixed(2).replace('.00', '');
            purchaseModal.querySelector('[data-purchase-sale]').textContent = total + ' ₽';
            purchaseModal.querySelector('[data-pay-amount]').textContent = total + ' ₽';
        }

        function updateTerms() {
            payButton.disabled = !terms.checked;
            funpayButton.setAttribute('aria-disabled', terms.checked ? 'false' : 'true');
        }
        purchaseModal.querySelectorAll('.product-option').forEach(function (button) {
            button.addEventListener('click', function () {
                purchaseModal.querySelectorAll('.product-option').forEach(function (item) { item.classList.remove('is-selected'); });
                button.classList.add('is-selected');
                purchaseModal.querySelector('[data-purchase-title]').textContent = button.dataset.productTitle;
                const regular = purchaseModal.querySelector('[data-purchase-regular]');
                regular.textContent = button.dataset.productRegular;
                regular.hidden = !button.dataset.productRegular;
                discount = 0;
                appliedPromo = '';
                promoInput.value = '';
                updateTotal();
                status.textContent = '';
            });
        });
        purchaseModal.querySelectorAll('[data-payment-provider]').forEach(function (button) {
            button.addEventListener('click', function () {
                purchaseModal.querySelectorAll('[data-payment-provider]').forEach(function (item) { item.classList.remove('is-selected'); });
                button.classList.add('is-selected');
                paymentProvider = button.dataset.paymentProvider;
                status.textContent = '';
            });
        });
        purchaseModal.querySelector('[data-apply-promo]').addEventListener('click', function () {
            const code = promoInput.value.trim();
            if (!code) { status.textContent = 'Введите промокод.'; return; }
            status.textContent = 'Проверяем промокод...';
            fetch('api/promo.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: code })
            }).then(async function (response) {
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Промокод не найден.');
                discount = Number(result.discount);
                appliedPromo = result.code;
                updateTotal();
                status.classList.add('is-success');
                status.textContent = 'Скидка ' + discount + '% применена.';
            }).catch(function (error) {
                discount = 0;
                appliedPromo = '';
                updateTotal();
                status.classList.remove('is-success');
                status.textContent = error.message;
            });
        });
        terms.addEventListener('change', updateTerms);
        funpayButton.addEventListener('click', function (event) {
            if (terms.checked) return;
            event.preventDefault();
            status.textContent = 'Подтвердите согласие с условиями.';
        });
        purchaseModal.querySelector('[data-start-payment]').addEventListener('click', async function (event) {
            const button = event.currentTarget;
            const product = purchaseModal.querySelector('.product-option.is-selected');
            if (!terms.checked) { status.textContent = 'Подтвердите согласие с условиями.'; return; }
            if (paymentProvider === 'freekassa' && !paymentEmail.checkValidity()) {
                status.textContent = 'Введите корректный email для оплаты.';
                paymentEmail.focus();
                return;
            }
            button.disabled = true;
            status.textContent = 'Создание счета...';
            try {
                const response = await fetch('api/' + paymentProvider + '_create.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ product: product.dataset.productId, promo_code: appliedPromo, email: paymentEmail.value.trim() })
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Не удалось создать счет.');
                window.location.assign(result.payment_url);
            } catch (error) {
                status.textContent = error.message;
                button.disabled = false;
            }
        });
    }

    const activateForms = document.querySelectorAll('#activate-key-form, [data-activate-key-form]');
    activateForms.forEach(function (activateForm) {
        const status = activateForm.querySelector('.modal-status, .subscription-key-status');
        activateForm.addEventListener('submit', async function (event) {
            event.preventDefault();
            const button = activateForm.querySelector('button[type="submit"]');
            button.disabled = true;
            status.textContent = 'Активация...';
            try {
                const response = await fetch('api/account.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'activate_key', key: activateForm.elements.key.value.trim() })
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Не удалось активировать ключ.');
                status.classList.add('is-success');
                status.textContent = result.success;
                window.setTimeout(function () { window.location.reload(); }, 900);
            } catch (error) {
                status.classList.remove('is-success');
                status.textContent = error.message;
            } finally {
                button.disabled = false;
            }
        });
    });

    document.querySelectorAll('.admin-ban-form').forEach(function (form) {
        form.addEventListener('submit', async function (event) {
            event.preventDefault();
            const actions = form.closest('[data-user-id]');
            try {
                await sendAdmin({ action: 'ban_user', user_id: actions.dataset.userId, days: form.elements.days.value, reason: form.elements.reason.value.trim() });
                report('Аккаунт заблокирован.', true);
            } catch (error) { report(error.message, false); }
        });
    });
});

document.addEventListener('DOMContentLoaded', function () {
    const input = document.getElementById('avatar-input');
    const status = document.getElementById('avatar-status');
    if (!input || !status) return;

    input.addEventListener('change', async function () {
        const file = input.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            status.textContent = 'Размер изображения не должен превышать 2 МБ.';
            input.value = '';
            return;
        }

        const payload = new FormData();
        payload.append('avatar', file);
        status.textContent = 'Загрузка...';

        try {
            const response = await fetch('api/upload_avatar.php', { method: 'POST', body: payload });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Не удалось загрузить изображение.');
            status.textContent = 'Аватар обновлен.';
            window.setTimeout(function () { window.location.reload(); }, 500);
        } catch (error) {
            status.textContent = error.message;
        }
    });
});

document.addEventListener('DOMContentLoaded', function () {
    const logoutButton = document.querySelector('[data-logout]');
    if (!logoutButton) return;

    logoutButton.addEventListener('click', async function () {
        await fetch('api/logout.php', { method: 'POST' });
        window.location.assign('index.php');
    });

    document.querySelectorAll('.admin-role-form').forEach(function (form) {
        form.addEventListener('submit', async function (event) {
            event.preventDefault();
            const actions = form.closest('[data-user-id]');
            try {
                await sendAdmin({ action: 'set_role', user_id: actions.dataset.userId, role: form.elements.role.value });
                report('Роль изменена.', true);
            } catch (error) { report(error.message, false); }
        });
    });
});

document.addEventListener('DOMContentLoaded', function () {
    const leaderboard = document.querySelector('[data-player-leaderboard]');
    if (!leaderboard) return;

    const labels = { funtime: 'FunTime', spookytime: 'SpookyTime', holyworld: 'HolyWorld' };
    const formatTime = function (seconds) {
        const total = Math.max(0, Number(seconds) || 0);
        const days = Math.floor(total / 86400);
        const hours = Math.floor(total % 86400 / 3600);
        const minutes = Math.floor(total % 3600 / 60);
        return (days ? days + 'д ' : '') + (hours ? hours + 'ч ' : '') + minutes + 'м';
    };
    const update = async function () {
        try {
            const response = await fetch('api/stats.php', { cache: 'no-store' });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Не удалось загрузить статистику.');
            const totals = Object.values(data.servers);
                const maximum = Math.max(1, ...totals);
            Object.entries(data.servers).forEach(function ([server, seconds]) {
                const label = document.querySelector('[data-server-total="' + server + '"]');
                const card = label && label.closest('.server-card');
                if (label) label.textContent = formatTime(seconds);
                if (card) card.style.setProperty('--server-height', Math.max(10, Math.round(Number(seconds) / maximum * 100)) + '%');
            });
            const graphPoints = { holyworld: [70, 0], funtime: [300, 0], spookytime: [530, 0] };
            Object.keys(graphPoints).forEach(function (server) {
                graphPoints[server][1] = 205 - Math.round(Number(data.servers[server] || 0) / maximum * 145);
                const point = document.querySelector('[data-stat-point="' + server + '"]');
                if (point) point.setAttribute('cy', graphPoints[server][1]);
            });
            const line = document.querySelector('[data-stat-line]');
            if (line) {
                const a = graphPoints.holyworld, b = graphPoints.funtime, c = graphPoints.spookytime;
                line.setAttribute('d', 'M' + a[0] + ' ' + a[1] + ' C' + (a[0] + 85) + ' ' + a[1] + ' ' + (b[0] - 85) + ' ' + b[1] + ' ' + b[0] + ' ' + b[1] + ' S' + (c[0] - 85) + ' ' + c[1] + ' ' + c[0] + ' ' + c[1]);
            }
            const graphPlayers = document.querySelector('[data-graph-players]');
            if (graphPlayers) {
                graphPlayers.replaceChildren();
                data.players.slice(0, 3).forEach(function (player, index) {
                    const server = ['holyworld', 'funtime', 'spookytime'][index];
                    const point = graphPoints[server];
                    const item = document.createElement('span');
                    item.className = 'activity-graph-player';
                    item.style.left = (point[0] / 600 * 100) + '%';
                    item.style.top = (point[1] / 250 * 100) + '%';
                    if (player.avatar) { const avatar = document.createElement('img'); avatar.src = 'uploads/' + encodeURIComponent(player.avatar); avatar.alt = ''; item.append(avatar); } else { const avatar = document.createElement('b'); avatar.textContent = (player.username || '?').slice(0, 1).toUpperCase(); item.append(avatar); }
                    const name = document.createElement('i'); name.textContent = player.username || 'Игрок'; item.append(name);
                    graphPlayers.append(item);
                });
            }
            leaderboard.replaceChildren();
            if (!data.players.length) {
                const item = document.createElement('li');
                item.className = 'leaderboard-loading';
                item.textContent = 'Данные появятся после первого запуска клиента.';
                leaderboard.append(item);
            }
            data.players.forEach(function (player, index) {
                const item = document.createElement('li');
                item.innerHTML = '<span class="player-rank">' + String(index + 1).padStart(2, '0') + '</span><span class="player-identity"></span><strong>' + formatTime(player.seconds) + '</strong>';
                const identity = item.querySelector('.player-identity');
                if (player.avatar) {
                    const avatar = document.createElement('img');
                    avatar.className = 'player-avatar';
                    avatar.src = 'uploads/' + encodeURIComponent(player.avatar);
                    avatar.alt = '';
                    identity.append(avatar);
                } else {
                    const avatar = document.createElement('span');
                    avatar.className = 'player-avatar player-avatar--placeholder';
                    avatar.textContent = (player.username || '?').slice(0, 1).toUpperCase();
                    identity.append(avatar);
                }
                const username = document.createElement('span');
                username.className = 'player-name';
                username.textContent = player.username;
                identity.append(username);
                const details = document.createElement('small');
                details.className = 'player-server';
                details.textContent = Object.keys(labels).map(function (server) {
                    return labels[server] + ' ' + formatTime(player.servers && player.servers[server]);
                }).join(' · ');
                identity.append(details);
                leaderboard.append(item);
            });
            const updated = document.querySelector('[data-stats-updated]');
            if (updated) updated.textContent = 'Обновлено сейчас';
        } catch (error) {
            leaderboard.innerHTML = '<li class="leaderboard-loading"></li>';
            leaderboard.firstChild.textContent = error.message;
        }
    };
    update();
    window.setInterval(update, 60000);
});

document.addEventListener('DOMContentLoaded', function () {
    const messages = document.querySelector('[data-chat-messages]');
    const form = document.querySelector('[data-chat-form]');
    if (!messages || !form) return;

    const status = document.querySelector('[data-chat-status]');
    const siteOnline = document.querySelector('[data-online-site]');
    const gameOnline = document.querySelector('[data-online-game]');
    let loading = false;

    const sendPresence = function () {
        return fetch('api/account.php', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'presence' }) }).catch(function () {});
    };
    const readJson = async function (response) {
        const body = await response.text();
        try { return JSON.parse(body); } catch (error) {
            throw new Error('Сервис чата недоступен (HTTP ' + response.status + ').');
        }
    };
    const renderMessage = function (message) {
        const item = document.createElement('article');
        item.className = 'chat-message';
        if (message.avatar) {
            const image = document.createElement('img');
            image.src = 'uploads/' + encodeURIComponent(message.avatar);
            image.alt = '';
            item.append(image);
        } else {
            const avatar = document.createElement('span');
            avatar.className = 'chat-avatar';
            avatar.textContent = (message.username || '?').slice(0, 1).toUpperCase();
            item.append(avatar);
        }
        const heading = document.createElement('div');
        const username = document.createElement('strong');
        username.textContent = message.username;
        const role = document.createElement('i');
        role.className = 'chat-role chat-role--' + String(message.role || 'Default').toLowerCase();
        role.textContent = message.role || 'Default';
        const time = document.createElement('time');
        time.textContent = new Date(message.created_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        heading.append(username, role, time);
        const text = document.createElement('span');
        text.textContent = message.text;
        item.append(heading, text);
        return item;
    };
    const loadChat = async function () {
        if (loading) return;
        loading = true;
        try {
            const response = await fetch('api/chat.php', { cache: 'no-store', credentials: 'same-origin' });
            const data = await readJson(response);
            if (!response.ok) throw new Error(data.error || 'Не удалось загрузить чат.');
            messages.replaceChildren();
            if (!data.messages.length) {
                const empty = document.createElement('p');
                empty.textContent = 'Сообщений пока нет.';
                messages.append(empty);
            } else {
                data.messages.forEach(function (message) { messages.append(renderMessage(message)); });
                messages.scrollTop = messages.scrollHeight;
            }
            if (siteOnline) siteOnline.textContent = data.online.site;
            if (gameOnline) gameOnline.textContent = data.online.game;
            if (status) status.textContent = '';
        } catch (error) {
            if (status) status.textContent = error.message;
        } finally {
            loading = false;
        }
    };

    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        const input = form.elements.text;
        const text = input.value.trim();
        if (!text) return;
        form.querySelector('button').disabled = true;
        try {
            const response = await fetch('api/chat.php', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: text }) });
            const data = await readJson(response);
            if (!response.ok) throw new Error(data.error || 'Не удалось отправить сообщение.');
            input.value = '';
            await loadChat();
        } catch (error) {
            if (status) status.textContent = error.message;
        } finally {
            form.querySelector('button').disabled = false;
        }
    });

    sendPresence().finally(loadChat);
    window.setInterval(sendPresence, 60000);
    window.setInterval(loadChat, 15000);
});

document.addEventListener('DOMContentLoaded', function () {
    const tabs = document.querySelectorAll('[data-profile-tab]');
    const panels = document.querySelectorAll('[data-profile-panel]');
    if (!tabs.length || !panels.length) return;
    tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            const name = tab.dataset.profileTab;
            tabs.forEach(function (item) { item.classList.toggle('is-active', item === tab); });
            panels.forEach(function (panel) { panel.hidden = panel.dataset.profilePanel !== name; });
        });
    });
});

document.addEventListener('DOMContentLoaded', function () {
    const params = new URLSearchParams(window.location.search);
    if (!window.location.pathname.endsWith('/profile.php') || params.get('payment') !== 'success') return;

    const orderId = params.get('order') || '';
    let attempts = 0;
    const maxAttempts = 5;

    function reconcilePayment() {
        fetch('api/crystalpay_reconcile.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: orderId })
        })
            .then(function (response) {
                if (!response.ok) throw new Error('Unable to check payment.');
                return response.json();
            })
            .then(function (result) {
                if (result.fulfilled > 0) {
                    window.location.replace('profile.php');
                } else if (++attempts < maxAttempts) {
                    window.setTimeout(reconcilePayment, 1500);
                }
            })
            .catch(function () {
                if (++attempts < maxAttempts) window.setTimeout(reconcilePayment, 1500);
            });
    }

    const purchaseSearch = document.querySelector('[data-purchase-search]');
    if (purchaseSearch) {
        purchaseSearch.addEventListener('input', function () {
            const value = purchaseSearch.value.trim().toLocaleLowerCase();
            document.querySelectorAll('[data-purchase-card]').forEach(function (card) {
                card.hidden = value !== '' && !card.dataset.purchaseSearchValue.includes(value);
            });
        });
    }

    reconcilePayment();
});
