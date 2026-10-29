import com.google.gson.*;
import com.sun.net.httpserver.*;
import java.io.IOException;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.Executors;

/** Local teaching fixture. State lasts for this process; restart restores the fixtures. */
public class IssueApi {
    record Issue(String id, String title, String description, String status, String priority, String createdAt) {}
    static final Gson JSON = new Gson();
    static final Map<String, Issue> STORE = Collections.synchronizedMap(new LinkedHashMap<>());
    static final List<String> STATUSES = List.of("OPEN", "IN_PROGRESS", "DONE");
    static final List<String> PRIORITIES = List.of("LOW", "MEDIUM", "HIGH");
    static int sequence = 32;

    public static void main(String[] args) throws IOException {
        for (int index = 1; index <= 32; index++) {
            String id = "ISS-%03d".formatted(index);
            STORE.put(id, new Issue(id, List.of("Исправить поиск", "Проверить форму", "Подключить список", "Обновить карточку").get((index - 1) % 4) + " · " + index,
                "Учебная заявка. Проверьте поведение интерфейса и объясните путь данных.", STATUSES.get((index - 1) % 3), PRIORITIES.get(((index - 1) / 3) % 3), "2026-10-01T09:00:00Z"));
        }
        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0);
        server.createContext("/api/issues", IssueApi::handle);
        server.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
        server.start();
        System.out.println("API_READY http://127.0.0.1:" + port);
    }

    static void handle(HttpExchange exchange) throws IOException {
        try {
            Map<String, String> query = query(exchange.getRequestURI().getRawQuery());
            String scenario = query.getOrDefault("scenario", "");
            if (scenario.equals("slow")) Thread.sleep(1500);
            if (scenario.equals("error")) { error(exchange, 500, "Демонстрационная ошибка сервера.", Map.of()); return; }
            if (scenario.equals("unauthorized") || scenario.equals("forbidden")) { error(exchange, scenario.equals("unauthorized") ? 401 : 403, "Демонстрация HTTP-статуса; авторизация не реализована.", Map.of()); return; }
            String path = exchange.getRequestURI().getPath(), method = exchange.getRequestMethod();
            if (!path.equals("/api/issues") && !path.startsWith("/api/issues/")) { error(exchange, 404, "Маршрут не найден.", Map.of()); return; }
            String id = path.equals("/api/issues") ? "" : path.substring("/api/issues/".length());
            if (id.isEmpty() && method.equals("GET")) { list(exchange, query); return; }
            if (!id.isEmpty() && method.equals("GET")) {
                Issue issue = STORE.get(id);
                if (issue == null) error(exchange, 404, "Заявка не найдена.", Map.of()); else send(exchange, 200, issue);
                return;
            }
            if ((id.isEmpty() && method.equals("POST")) || (!id.isEmpty() && method.equals("PATCH"))) {
                if (scenario.equals("validation")) { error(exchange, 400, "Проверьте поля.", Map.of("title", List.of("Название уже используется в демонстрационном сценарии."))); return; }
                write(exchange, id); return;
            }
            error(exchange, 405, "Метод не поддерживается.", Map.of());
        } catch (IllegalArgumentException | JsonParseException exception) {
            error(exchange, 400, "Неверный JSON или параметры запроса.", Map.of());
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt(); error(exchange, 503, "Запрос прерван.", Map.of());
        } catch (Exception exception) {
            error(exchange, 500, "Ошибка учебного сервиса.", Map.of());
        } finally { exchange.close(); }
    }

    static void list(HttpExchange exchange, Map<String, String> query) throws IOException {
        int page = Integer.parseInt(query.getOrDefault("page", "0")), size = Integer.parseInt(query.getOrDefault("size", "10"));
        if (page < 0 || size < 1 || size > 100) throw new IllegalArgumentException("page/size");
        String status = query.getOrDefault("status", ""), priority = query.getOrDefault("priority", ""), search = query.getOrDefault("q", "").trim().toLowerCase(Locale.ROOT);
        if ((!status.isEmpty() && !STATUSES.contains(status)) || (!priority.isEmpty() && !PRIORITIES.contains(priority))) throw new IllegalArgumentException("filter");
        List<Issue> matches;
        synchronized (STORE) {
            matches = STORE.values().stream().filter(issue -> status.isEmpty() || issue.status().equals(status)).filter(issue -> priority.isEmpty() || issue.priority().equals(priority)).filter(issue -> (issue.title() + " " + issue.description()).toLowerCase(Locale.ROOT).contains(search)).toList();
        }
        if (query.getOrDefault("scenario", "").equals("empty")) matches = List.of();
        int from = (int) Math.min((long) page * size, matches.size()), to = Math.min(from + size, matches.size());
        send(exchange, 200, Map.of("items", matches.subList(from, to), "total", matches.size(), "page", page, "size", size));
    }

    static void write(HttpExchange exchange, String id) throws IOException {
        if (!id.isEmpty() && !STORE.containsKey(id)) { error(exchange, 404, "Заявка не найдена.", Map.of()); return; }
        byte[] bytes = exchange.getRequestBody().readNBytes(16385);
        if (bytes.length > 16384) { error(exchange, 413, "Слишком большой запрос.", Map.of()); return; }
        JsonElement parsed = JsonParser.parseString(new String(bytes, StandardCharsets.UTF_8));
        if (!parsed.isJsonObject()) throw new IllegalArgumentException("object required");
        JsonObject body = parsed.getAsJsonObject();
        Map<String, List<String>> fields = new LinkedHashMap<>();
        String title = field(body, "title", fields), description = field(body, "description", fields), status = field(body, "status", fields), priority = field(body, "priority", fields);
        if (title != null) title = title.trim();
        if ((id.isEmpty() || body.has("title")) && (title == null || title.length() < 3 || title.length() > 120)) fields.put("title", List.of("От 3 до 120 символов после удаления пробелов по краям."));
        if (description != null && description.length() > 2000) fields.put("description", List.of("Не более 2000 символов."));
        if ((id.isEmpty() || body.has("priority")) && !PRIORITIES.contains(priority == null ? "" : priority)) fields.put("priority", List.of("Выберите LOW, MEDIUM или HIGH."));
        if (body.has("status") && !STATUSES.contains(status == null ? "" : status)) fields.put("status", List.of("Выберите OPEN, IN_PROGRESS или DONE."));
        if (!id.isEmpty() && body.keySet().stream().anyMatch(key -> !List.of("title", "status", "priority").contains(key))) fields.put("request", List.of("PATCH изменяет только title, status, priority."));
        if (!fields.isEmpty()) { error(exchange, 400, "Проверьте поля.", fields); return; }
        synchronized (STORE) {
            Issue issue;
            if (id.isEmpty()) {
                id = "ISS-%03d".formatted(++sequence);
                issue = new Issue(id, title, description == null ? "" : description, "OPEN", priority, Instant.now().toString());
            } else {
                Issue old = STORE.get(id);
                issue = new Issue(id, title == null ? old.title() : title, old.description(), status == null ? old.status() : status, priority == null ? old.priority() : priority, old.createdAt());
            }
            STORE.put(id, issue); send(exchange, exchange.getRequestMethod().equals("POST") ? 201 : 200, issue);
        }
    }

    static String field(JsonObject body, String key, Map<String, List<String>> errors) {
        if (!body.has(key)) return null;
        JsonElement value = body.get(key);
        if (!value.isJsonPrimitive() || !value.getAsJsonPrimitive().isString()) { errors.put(key, List.of("Ожидается строка.")); return null; }
        return value.getAsString();
    }
    static Map<String, String> query(String raw) {
        Map<String, String> query = new HashMap<>();
        if (raw != null && !raw.isEmpty()) for (String pair : raw.split("&")) { String[] parts = pair.split("=", 2); query.put(URLDecoder.decode(parts[0], StandardCharsets.UTF_8), parts.length > 1 ? URLDecoder.decode(parts[1], StandardCharsets.UTF_8) : ""); }
        return query;
    }
    static void error(HttpExchange exchange, int status, String message, Map<String, List<String>> fields) throws IOException { send(exchange, status, Map.of("message", message, "fieldErrors", fields)); }
    static void send(HttpExchange exchange, int status, Object value) throws IOException {
        byte[] bytes = JSON.toJson(value).getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.getResponseHeaders().set("Cache-Control", "no-store");
        exchange.sendResponseHeaders(status, bytes.length); exchange.getResponseBody().write(bytes);
    }
}
