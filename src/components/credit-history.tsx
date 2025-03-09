"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../supabase/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ArrowDown, ArrowUp, Clock, RefreshCw } from "lucide-react";

type CreditChange = {
  id: string;
  user_id: string;
  previous_credits: number;
  new_credits: number;
  change_amount: number;
  source: string;
  reference_id: string | null;
  created_at: string;
  metadata: any;
};

export default function CreditHistory({ userId }: { userId: string }) {
  const [history, setHistory] = useState<CreditChange[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCreditHistory = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("credit_history")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) throw error;
        setHistory(data || []);
      } catch (error) {
        console.error("Error fetching credit history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCreditHistory();

    // Set up realtime subscription
    const channel = supabase
      .channel("credit_history_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "credit_history",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setHistory((prev) => [
            payload.new as CreditChange,
            ...prev.slice(0, 9),
          ]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getSourceBadge = (source: string) => {
    switch (source.toLowerCase()) {
      case "stripe_checkout":
        return <Badge className="bg-green-100 text-green-800">Purchase</Badge>;
      case "api_usage":
        return <Badge className="bg-blue-100 text-blue-800">API Usage</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{source}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Credit History</CardTitle>
        {loading && (
          <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </CardHeader>
      <CardContent>
        {history.length > 0 ? (
          <div className="space-y-4">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between border-b pb-3"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {item.change_amount > 0 ? (
                      <div className="rounded-full bg-green-100 p-1">
                        <ArrowUp className="h-4 w-4 text-green-600" />
                      </div>
                    ) : (
                      <div className="rounded-full bg-red-100 p-1">
                        <ArrowDown className="h-4 w-4 text-red-600" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      {getSourceBadge(item.source)}
                      <span className="text-sm font-medium">
                        {item.change_amount > 0 ? "+" : ""}
                        {item.change_amount} credits
                      </span>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="mr-1 h-3 w-3" />
                      {formatDate(item.created_at)}
                    </div>
                  </div>
                </div>
                <div className="text-sm font-medium">
                  {item.previous_credits} → {item.new_credits}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-muted-foreground">
            {loading
              ? "Loading credit history..."
              : "No credit history available"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
