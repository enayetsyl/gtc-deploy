"use client";
import { z } from "zod";
import { useState, type ChangeEvent } from "react";
import { type AxiosError } from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSubmitLeadPublic } from "@/hooks/useLeads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSectorsPublic } from "@/hooks/useSectors";

const LeadSchema = z.object({
  sectorId: z.string().min(1, "Select a sector"),
  name: z.string().min(2, "Enter your name"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(6).max(32).optional().or(z.literal("")),
  message: z.string().max(2000).optional().or(z.literal("")),
  gdprAgree: z
    .boolean()
    .refine((v) => v === true, { message: "You must agree" }),
});

type LeadFormValues = z.infer<typeof LeadSchema>;

export default function LeadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const submit = useSubmitLeadPublic();
  const sectors = useSectorsPublic();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<LeadFormValues>({
    resolver: zodResolver(LeadSchema),
    defaultValues: {
      sectorId: "",
      name: "",
      email: "",
      phone: "",
      message: "",
      gdprAgree: false,
    },
  });

  async function onSubmit(values: LeadFormValues) {
    setProgress(0);
    try {
      await submit.mutateAsync({
        ...values,
        email: values.email || undefined,
        phone: values.phone || undefined,
        message: values.message || undefined,
        files,
        onUploadProgress: setProgress,
      });
      toast.success("Lead submitted — We will get back to you soon.");
      reset();
      setFiles([]);
    } catch (err: unknown) {
      const axiosErr = err as AxiosError<{ error?: string }> | undefined;
      const status = axiosErr?.response?.status;
      if (status === 429) {
        toast.error("Too many submissions — Please try again later.");
      } else {
        toast.error("Submission failed — Please check fields and try again.");
      }
    } finally {
      setProgress(null);
    }
  }

  const sectorItems = (sectors.data || []) as Array<{ id: string; name: string }>;
  const sectorValue = watch("sectorId");

  console.log('sector', sectors.data)

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Contact / Lead</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            {/* Register sectorId with RHF so it's included in the payload */}
            <input type="hidden" {...register("sectorId")} />

            <div>
              <Label htmlFor="sectorId">Sector</Label>
              {sectors.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading sectors…</p>
              ) : sectorItems.length ? (
                <Select
                  value={sectorValue}
                  onValueChange={(v) =>
                    setValue("sectorId", v, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sector" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectorItems.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <>
                  <Input
                    id="sectorId"
                    placeholder="Enter sector ID"
                    {...register("sectorId")}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    No public sector list available. Enter sector ID manually.
                  </p>
                </>
              )}
              {errors.sectorId && (
                <p className="text-sm text-red-500">{errors.sectorId.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register("name")} />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register("email")} />
                {errors.email && (
                  <p className="text-sm text-red-500">
                    {String(errors.email?.message ?? "")}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...register("phone")} />
                {errors.phone && (
                  <p className="text-sm text-red-500">
                    {String(errors.phone?.message ?? "")}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" rows={4} {...register("message")} />
            </div>

            <div>
              <Label>Attachments</Label>
              <input
                type="file"
                multiple
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setFiles(Array.from(e.target.files ?? []))
                }
                className="block w-full rounded border p-2"
                accept=".pdf,image/png,image/jpeg"
              />
              {files.length > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {files.length} file(s) selected
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="gdpr"
                checked={watch("gdprAgree")}
                onCheckedChange={(v) => setValue("gdprAgree", Boolean(v))}
              />
              <Label htmlFor="gdpr">I agree to the privacy policy (GDPR)</Label>
            </div>
            {errors.gdprAgree && (
              <p className="text-sm text-red-500">{errors.gdprAgree.message}</p>
            )}

            {progress !== null && (
              <div className="w-full h-2 bg-muted rounded">
                <div
                  className="h-2 bg-primary rounded"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            <Button type="submit" disabled={submit.isPending}>
              Submit
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
