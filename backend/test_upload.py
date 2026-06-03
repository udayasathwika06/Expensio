import jwt
import urllib.request
import urllib.error

token = jwt.encode({'sub': 'test-user-id'}, 'fake-secret', algorithm='HS256')
boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
body = (
    f'--{boundary}\r\n'
    f'Content-Disposition: form-data; name="file"; filename="receipt.png"\r\n'
    f'Content-Type: image/png\r\n\r\n'
    f'fake image data\r\n'
    f'--{boundary}--\r\n'
).encode('utf-8')

req = urllib.request.Request(
    'https://expensio-b4im.onrender.com/api/upload/receipt',
    data=body,
    headers={
        'Authorization': f'Bearer {token}',
        'Content-Type': f'multipart/form-data; boundary={boundary}'
    },
    method='POST'
)

try:
    with urllib.request.urlopen(req) as response:
        print("STATUS:", response.status)
        print("BODY:", response.read().decode())
except urllib.error.HTTPError as e:
    print("STATUS:", e.code)
    print("BODY:", e.read().decode())
