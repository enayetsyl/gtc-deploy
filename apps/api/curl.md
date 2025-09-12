curl -X POST http://localhost:4000/api/auth/login \
  -H "content-type: application/json" \
  -d '{"email":"admin@gtc.local","password":"admin123"}'


# test /me with bearer token (replace <access>)
curl http://localhost:4000/api/me -H "authorization: Bearer <access>"


# list sectors
curl -H "Authorization: Bearer <ACCESS_TOKEN>" http://localhost:4000/api/admin/sectors

# create sector
curl -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"name":"K12"}' \
  http://localhost:4000/api/admin/sectors

# list points
curl -H "Authorization: Bearer <ACCESS_TOKEN>" http://localhost:4000/api/admin/points

# create point
curl -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"name":"GTC Point C","email":"point.c@gtc.local","sectorId":"<sectorId>"}' \
  http://localhost:4000/api/admin/points

# list services
curl -H "Authorization: Bearer <ACCESS_TOKEN>" http://localhost:4000/api/admin/services

# create service
curl -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"code":"NOTIFY","name":"Notification Service"}' \
  http://localhost:4000/api/admin/services
