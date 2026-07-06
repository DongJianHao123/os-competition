import COS from 'cos-js-sdk-v5';
import axios from 'axios';

export async function fileUpload(file: File): Promise<string> {
  const { data: credentials } = await axios.get(
    `https://opencamp.cn/api/oss/keyAndCredentials?filename=${encodeURIComponent(file.name)}`,
  );
  const cos = new COS({
    Domain: credentials.CustomDomain,
    getAuthorization: (_options: any, callback: any) => {
      callback({
        TmpSecretId: credentials.TmpSecretId,
        TmpSecretKey: credentials.TmpSecretKey,
        SecurityToken: credentials.SessionToken,
        StartTime: credentials.StartTime,
        ExpiredTime: credentials.ExpiredTime,
      });
    },
  });
  await cos.putObject({
    Bucket: credentials.Bucket,
    Region: credentials.Region,
    Key: credentials.Key,
    Body: file,
  });
  return credentials.CustomUrl;
}
