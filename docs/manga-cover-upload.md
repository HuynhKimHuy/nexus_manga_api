# Create a manga with a cover

`POST /mangas` accepts `multipart/form-data`. Send the image in the optional
`coverImage` file field, along with `title`, `slug`, and any optional manga
fields (`author`, `artist`, `status`, `releaseYear`). `releaseYear` accepts a
positive integer written as text in multipart requests.

```sh
curl http://localhost:3000/mangas \
  -F 'title=One Piece' \
  -F 'slug=one-piece' \
  -F 'releaseYear=1997' \
  -F 'coverImage=@/path/to/cover.jpg'
```

JPEG, PNG, and WebP files up to 5 MiB are supported. The server checks the file
signature, uploads to R2 under a unique `mangas/covers/` key, and saves the public
URL in `coverImage`. Oversized files return HTTP 413; invalid files return 400.
Do not submit both a file and a URL in `coverImage`.

Configure the existing R2 credentials (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`) and set `R2_PUBLIC_URL` to the bucket's
public domain, for example `https://images.example.com`. The domain must serve
objects from that bucket. Credentials need object upload and delete access.

JSON requests continue to accept an optional HTTP URL in `coverImage`.
If database insertion fails after uploading, the server attempts to delete the
uploaded image. A failed cleanup is logged for follow-up.
