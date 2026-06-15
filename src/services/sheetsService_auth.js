import { GAS_WEBHOOK_URL } from '../config';

export const authenticateUser = async (userId, password) => {
  try {
    console.log('🔐 Authenticating user:', userId);
    
    const payload = {
      action: 'authenticateUser',
      userId: userId,
      password: password
    };
    
    const response = await fetch(GAS_WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify(payload)
    });
    
    // mode: 'no-cors' では response.json() が使えないため、別の方法が必要
    // CORS 対応版の処理を行う
    const text = await response.text();
    
    if (!text) {
      return { success: false, message: 'サーバーからの応答がありません' };
    }
    
    try {
      const result = JSON.parse(text);
      console.log('✅ Authentication result:', result);
      return result;
    } catch (e) {
      console.error('JSON parse error:', text);
      return { success: false, message: 'サーバーエラー' };
    }
  } catch (error) {
    console.error('❌ authenticateUser error:', error);
    return { success: false, message: error.message };
  }
};
