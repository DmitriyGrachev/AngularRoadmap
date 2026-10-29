export function details(route, request) {
  const id = route.snapshot.paramMap.get('id');
  return request(id);
}
