"""Decodifica o QR de uma imagem PNG (captura da pagina) e imprime o texto, uma linha por decodificador.
Uso: python3 -I tests/hub/pix_decode.py <png>   (precisa de opencv-python; sai com 3 se nao houver)"""
import sys
try:
    import cv2
except ImportError:
    sys.exit(3)
img = cv2.imread(sys.argv[1])
t, _, _ = cv2.QRCodeDetector().detectAndDecode(img)
print("opencv-QRCodeDetector\t" + t)
if hasattr(cv2, "wechat_qrcode_WeChatQRCode"):
    r, _ = cv2.wechat_qrcode_WeChatQRCode().detectAndDecode(img)
    print("opencv-wechat\t" + (r[0] if r else ""))
