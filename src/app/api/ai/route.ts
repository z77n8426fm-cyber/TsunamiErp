import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

/**
 * MÓDULO 10 — Asistente IA.
 *
 * Endpoint de chat que conecta Claude con la base de datos del ERP mediante
 * herramientas (tool use). Las consultas se ejecutan con la sesión del
 * usuario, por lo que las políticas RLS y sus permisos se respetan siempre.
 */

const SYSTEM_PROMPT = `Eres el asistente de inteligencia artificial de TSUNAMI IMPORT, SRL,
una empresa dominicana de importación y venta al por mayor de ropa.

Respondes preguntas sobre el negocio usando las herramientas disponibles para
consultar datos reales del ERP: inventario, ventas, clientes e importaciones.

Reglas:
- Responde siempre en español, de forma clara y breve.
- Usa las herramientas para obtener datos reales; nunca inventes cifras.
- Los montos están en pesos dominicanos (RD$) salvo que se indique lo contrario.
- Si una consulta no devuelve datos, dilo con naturalidad y sugiere qué revisar.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "buscar_inventario",
    description:
      "Busca productos por nombre, color, talla o SKU y devuelve sus existencias totales, costo y precios. Útil para preguntas como '¿cuántas camisetas negras talla L tengo?'",
    input_schema: {
      type: "object",
      properties: {
        busqueda: { type: "string", description: "Texto a buscar en el nombre o SKU del producto" },
        color: { type: "string", description: "Filtrar por color (opcional)" },
        talla: { type: "string", description: "Filtrar por talla (opcional)" },
      },
      required: ["busqueda"],
    },
  },
  {
    name: "productos_mas_vendidos",
    description: "Devuelve los productos más vendidos (unidades e ingresos) según las facturas registradas.",
    input_schema: {
      type: "object",
      properties: {
        limite: { type: "number", description: "Cantidad de productos a devolver (por defecto 10)" },
      },
    },
  },
  {
    name: "mejores_clientes",
    description: "Devuelve los clientes que más compran, con su total facturado y balance pendiente.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "valor_inventario",
    description: "Calcula el valor total del inventario (existencias por costo) y estadísticas generales.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "productos_para_reordenar",
    description:
      "Lista los productos agotados o con inventario por debajo del mínimo, que deberían volver a importarse.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "resumen_ventas",
    description: "Resumen de ventas facturadas: hoy, este mes y total de documentos.",
    input_schema: { type: "object", properties: {} },
  },
];

/** Ejecuta la herramienta solicitada por el modelo contra Supabase. */
async function runTool(
  supabase: Awaited<ReturnType<typeof createClient>>,
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "buscar_inventario": {
      let query = supabase
        .from("products")
        .select("sku, name, color, size, min_stock, total_cost, wholesale_price, stock:inventory_stock(quantity)")
        .eq("is_active", true)
        .limit(25);

      const term = String(input.busqueda ?? "").trim();
      if (term) query = query.or(`name.ilike.%${term}%,sku.ilike.%${term}%`);
      if (input.color) query = query.ilike("color", `%${input.color}%`);
      if (input.talla) query = query.ilike("size", `%${input.talla}%`);

      const { data, error } = await query;
      if (error) return `Error: ${error.message}`;

      const rows = (data ?? []).map((p) => ({
        sku: p.sku,
        producto: p.name,
        color: p.color,
        talla: p.size,
        existencia: (p.stock as { quantity: number }[]).reduce((s, x) => s + x.quantity, 0),
        precio_mayor: p.wholesale_price,
      }));
      return JSON.stringify(rows);
    }

    case "productos_mas_vendidos": {
      const { data, error } = await supabase
        .from("v_top_products")
        .select("*")
        .limit(Number(input.limite ?? 10));
      return error ? `Error: ${error.message}` : JSON.stringify(data);
    }

    case "mejores_clientes": {
      const { data, error } = await supabase
        .from("sales")
        .select("total, customer:customers(name, company)")
        .eq("doc_type", "factura")
        .neq("status", "cancelado");
      if (error) return `Error: ${error.message}`;

      const byCustomer = new Map<string, number>();
      for (const s of data ?? []) {
        const customer = s.customer as unknown as { name: string; company: string | null } | null;
        const key = customer?.company || customer?.name || "Desconocido";
        byCustomer.set(key, (byCustomer.get(key) ?? 0) + Number(s.total));
      }
      const top = Array.from(byCustomer.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([cliente, total]) => ({ cliente, total_facturado: total }));
      return JSON.stringify(top);
    }

    case "valor_inventario": {
      const { data, error } = await supabase.rpc("get_dashboard_stats");
      return error ? `Error: ${error.message}` : JSON.stringify(data);
    }

    case "productos_para_reordenar": {
      const { data, error } = await supabase.from("v_low_stock").select("*").limit(30);
      return error ? `Error: ${error.message}` : JSON.stringify(data);
    }

    case "resumen_ventas": {
      const { data, error } = await supabase.rpc("get_dashboard_stats");
      return error ? `Error: ${error.message}` : JSON.stringify(data);
    }

    default:
      return `Herramienta desconocida: ${name}`;
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "El asistente no está configurado: falta ANTHROPIC_API_KEY en las variables de entorno." },
      { status: 500 }
    );
  }

  const { messages } = (await request.json()) as {
    messages: { role: "user" | "assistant"; content: string }[];
  };

  const anthropic = new Anthropic();
  const conversation: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  try {
    // Bucle de tool use: el modelo puede encadenar varias consultas
    for (let turn = 0; turn < 6; turn++) {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages: conversation,
      });

      if (response.stop_reason !== "tool_use") {
        const text = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n");
        return NextResponse.json({ reply: text });
      }

      conversation.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type === "tool_use") {
          const result = await runTool(supabase, block.name, block.input as Record<string, unknown>);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }
      }
      conversation.push({ role: "user", content: toolResults });
    }

    return NextResponse.json({
      reply: "No pude completar la consulta. Intenta reformular la pregunta.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error del asistente.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
