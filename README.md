# api-cache

Test repo to push TPS

Test the API routes
--------------------

Fetches all released songs.
```
$ curl http://localhost:3000/playlist
```
Fetches a specific song by its ID.
```
$ curl http://localhost:3000/song/1
```
Creates a new artist.
```
curl -X POST -H "Content-Type: application/json" -d '{"name":"Nditah Sam", "email":"contact@telixia.com"}' http://localhost:3000/artist
```
Creates (or compose) a new song (unreleased)
```
curl -X POST -H "Content-Type: application/json" -d '{"title":"Take my hand", "singerEmail":"contact@telixia.com"}' http://localhost:3000/song
```
Sets the released field of a song to true.
```
curl -X PUT http://localhost:3000/song/release/2
```
Deletes a song by its database record Id.
```
curl -X DELETE http://localhost:3000/song/1
```
Re-query playlist again
```
curl http://localhost:3000/playlist
```
