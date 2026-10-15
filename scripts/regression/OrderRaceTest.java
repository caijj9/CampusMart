import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 并发抢单测试：让 N 个线程【真正同时】发下单请求
 *
 * 用法：java OrderRaceTest <productId> <token>
 */
public class OrderRaceTest {

    static String URL_STR = "http://localhost:8080/order/create";
    static String TOKEN;
    static long PRODUCT_ID;
    static final int N = 50;          // 并发线程数

    public static void main(String[] args) throws Exception {
        PRODUCT_ID = Long.parseLong(args[0]);
        TOKEN = args[1];

        CountDownLatch gate = new CountDownLatch(1);   // 起跑线
        CountDownLatch done = new CountDownLatch(N);

        ConcurrentLinkedQueue<String> okBody = new ConcurrentLinkedQueue<>();
        AtomicInteger success = new AtomicInteger();
        AtomicInteger failed = new AtomicInteger();

        for (int i = 0; i < N; i++) {
            new Thread(() -> {
                try {
                    gate.await();                      // 全部线程在这里等
                    String body = "{\"productId\":" + PRODUCT_ID + "}";

                    HttpURLConnection conn =
                            (HttpURLConnection) new URL(URL_STR).openConnection();
                    conn.setRequestMethod("POST");
                    conn.setDoOutput(true);
                    conn.setConnectTimeout(10000);
                    conn.setReadTimeout(30000);
                    conn.setRequestProperty("Content-Type", "application/json");
                    conn.setRequestProperty("Authorization", "Bearer " + TOKEN);

                    try (OutputStream os = conn.getOutputStream()) {
                        os.write(body.getBytes(StandardCharsets.UTF_8));
                    }

                    int httpCode = conn.getResponseCode();
                    InputStream in = (httpCode == 200) ? conn.getInputStream() : conn.getErrorStream();
                    String resp = in == null ? "" : new String(in.readAllBytes(), StandardCharsets.UTF_8);

                    if (resp.contains("\"code\":0")) {
                        success.incrementAndGet();
                        okBody.add(resp);
                    } else {
                        failed.incrementAndGet();
                    }
                } catch (Exception e) {
                    failed.incrementAndGet();
                } finally {
                    done.countDown();
                }
            }).start();
        }

        System.out.println("50 个线程已就位，发令……");
        gate.countDown();          // 发令枪
        done.await();              // 等全部结束

        System.out.println();
        System.out.println("========== 结果 ==========");
        System.out.println("并发线程数 : " + N);
        System.out.println("下单成功   : " + success.get() + " 个");
        System.out.println("被拒绝     : " + failed.get() + " 个");
        System.out.println("成功返回的订单 id: " + okBody);
        System.out.println("==========================");
    }
}
